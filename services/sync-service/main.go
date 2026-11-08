package main

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"image"
	_ "image/gif"
	"image/jpeg"
	_ "image/png"
	"io"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"runtime"
	"strconv"
	"strings"
	"sync/atomic"
	"time"
)

type Config struct {
	Port               string
	UploadsDir         string
	BackendURL         string
	AppDomain          string
	MaxConcurrentUploads int
}

var (
	httpRequestsTotal atomic.Int64
	httpErrorsTotal   atomic.Int64
	uploadsTotal      atomic.Int64
	inFlight          atomic.Int64
)

type UploadResponse struct {
	Success      bool   `json:"success"`
	URL          string `json:"url"`
	ThumbnailURL string `json:"thumbnailUrl,omitempty"`
	FileName     string `json:"fileName"`
	Size         int64  `json:"size"`
	SHA256       string `json:"sha256"`
	Message      string `json:"message,omitempty"`
}

type BatchSyncResponse struct {
	Total     int      `json:"total"`
	Synced    int      `json:"synced"`
	Failed    int      `json:"failed"`
	SyncedIDs []string `json:"syncedIds"`
	Errors    []string `json:"errors,omitempty"`
}

func getEnv(key, fallback string) string {
	if val := os.Getenv(key); val != "" {
		return val
	}
	return fallback
}

func main() {
	maxConc, _ := strconv.Atoi(getEnv("MAX_CONCURRENT_UPLOADS", "8"))
	if maxConc <= 0 {
		maxConc = 8
	}
	cfg := Config{
		Port:                 getEnv("PORT", "8080"),
		UploadsDir:           getEnv("UPLOADS_DIR", "/data/uploads"),
		BackendURL:           getEnv("BACKEND_URL", "http://backend:8000"),
		AppDomain:            getEnv("APP_DOMAIN", "ecoraices.neuraljira.tech"),
		MaxConcurrentUploads: maxConc,
	}

	obsDir := filepath.Join(cfg.UploadsDir, "observations")
	if err := os.MkdirAll(obsDir, 0755); err != nil {
		log.Printf("[Sync Service] Advertencia: No se pudo crear directorio %s: %v", obsDir, err)
	}

	mux := http.NewServeMux()
	sem := make(chan struct{}, cfg.MaxConcurrentUploads)

	// --- /metrics (Prometheus exposition sin dependencias) ---
	mux.HandleFunc("/metrics", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "text/plain; version=0.0.4")
		var mem runtime.MemStats
		runtime.ReadMemStats(&mem)
		fmt.Fprintf(w, "# HELP http_requests_total Total HTTP requests\n# TYPE http_requests_total counter\nhttp_requests_total %d\n", httpRequestsTotal.Load())
		fmt.Fprintf(w, "# HELP http_errors_total Total HTTP error responses\n# TYPE http_errors_total counter\nhttp_errors_total %d\n", httpErrorsTotal.Load())
		fmt.Fprintf(w, "# HELP uploads_total Total successful uploads\n# TYPE uploads_total counter\nuploads_total %d\n", uploadsTotal.Load())
		fmt.Fprintf(w, "# HELP http_requests_in_flight Requests in flight\n# TYPE http_requests_in_flight gauge\nhttp_requests_in_flight %d\n", inFlight.Load())
		fmt.Fprintf(w, "# HELP go_mem_alloc_bytes Allocated memory\n# TYPE go_mem_alloc_bytes gauge\ngo_mem_alloc_bytes %d\n", mem.Alloc)
		fmt.Fprintf(w, "# HELP go_goroutines Number of goroutines\n# TYPE go_goroutines gauge\ngo_goroutines %d\n", runtime.NumGoroutine())
	})

	// --- /api/sync/health ---
	mux.HandleFunc("/api/sync/health", func(w http.ResponseWriter, r *http.Request) {
		enableCORS(w, r, cfg.AppDomain)
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusOK)
			return
		}
		if err := os.MkdirAll(obsDir, 0755); err != nil {
			httpErrorsTotal.Add(1)
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusServiceUnavailable)
			json.NewEncoder(w).Encode(map[string]interface{}{"status": "degraded", "detail": "uploads dir not writable"})
			return
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"status":      "ok",
			"service":     "ecoraices-sync-service",
			"runtime":     "go",
			"domain":      cfg.AppDomain,
			"uploads_dir": cfg.UploadsDir,
			"timestamp":   time.Now().UTC().Format(time.RFC3339),
		})
	})

	// --- upload & batch con semáforo de concurrencia ---
	mux.HandleFunc("/api/sync/upload", func(w http.ResponseWriter, r *http.Request) {
		enableCORS(w, r, cfg.AppDomain)
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusOK)
			return
		}
		if r.Method != http.MethodPost {
			writeJSONError(w, "Método no permitido", http.StatusMethodNotAllowed)
			return
		}
		select {
		case sem <- struct{}{}:
			defer func() { <-sem }()
		default:
			writeJSONError(w, "Servidor ocupado, intenta de nuevo", http.StatusServiceUnavailable)
			return
		}
		handleUpload(w, r, obsDir)
	})

	mux.HandleFunc("/api/sync/batch", func(w http.ResponseWriter, r *http.Request) {
		enableCORS(w, r, cfg.AppDomain)
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusOK)
			return
		}
		if r.Method != http.MethodPost {
			writeJSONError(w, "Método no permitido", http.StatusMethodNotAllowed)
			return
		}
		select {
		case sem <- struct{}{}:
			defer func() { <-sem }()
		default:
			writeJSONError(w, "Servidor ocupado, intenta de nuevo", http.StatusServiceUnavailable)
			return
		}
		handleBatchSync(w, r, cfg)
	})

	server := &http.Server{
		Addr:              ":" + cfg.Port,
		Handler:           withMetrics(withRecover(withRequestID(mux))),
		ReadHeaderTimeout: 10 * time.Second,
		ReadTimeout:       60 * time.Second,
		WriteTimeout:      120 * time.Second,
		IdleTimeout:       60 * time.Second,
		MaxHeaderBytes:    1 << 20,
	}
	GOMAXPROCS := runtime.GOMAXPROCS(0)
	log.Printf("[Sync Service] Servidor Go iniciado en http://0.0.0.0:%s (GOMAXPROCS=%d maxConcurrent=%d)", cfg.Port, GOMAXPROCS, cfg.MaxConcurrentUploads)
	log.Printf("[Sync Service] Dominio: %s | Uploads: %s", cfg.AppDomain, obsDir)

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	go func() {
		<-ctx.Done()
		server.Close()
	}()
	if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
		log.Fatalf("[Sync Service] Error al iniciar servidor: %v", err)
	}
}

func withRecover(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		defer func() {
			if rec := recover(); rec != nil {
				log.Printf("[Sync] panic recovered: %v", rec)
				httpErrorsTotal.Add(1)
				writeJSONError(w, "Error interno", http.StatusInternalServerError)
			}
		}()
		next.ServeHTTP(w, r)
	})
}

func withRequestID(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		rid := r.Header.Get("X-Request-ID")
		if rid == "" {
			rid = fmt.Sprintf("%d-%d", time.Now().UnixNano(), os.Getpid())
		}
		w.Header().Set("X-Request-ID", rid)
		next.ServeHTTP(w, r.WithContext(context.WithValue(r.Context(), "request_id", rid)))
	})
}

func withMetrics(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		inFlight.Add(1)
		defer inFlight.Add(-1)
		httpRequestsTotal.Add(1)
		next.ServeHTTP(w, r)
	})
}

func writeJSONError(w http.ResponseWriter, msg string, status int) {
	httpErrorsTotal.Add(1)
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(map[string]string{"error": msg})
}

func enableCORS(w http.ResponseWriter, r *http.Request, appDomain string) {
	origin := r.Header.Get("Origin")
	if origin == "" {
		w.Header().Set("Access-Control-Allow-Origin", "*")
	} else {
		// Only reflect trusted origins (app domain or localhost dev)
		allowed := strings.Contains(origin, appDomain) || strings.Contains(origin, "localhost") || strings.Contains(origin, "127.0.0.1")
		if allowed {
			w.Header().Set("Access-Control-Allow-Origin", origin)
			w.Header().Set("Access-Control-Allow-Credentials", "true")
		} else {
			w.Header().Set("Access-Control-Allow-Origin", "*")
		}
	}
	w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With")
}

func sanitizeFilename(name string) string {
	name = filepath.Base(name)
	name = strings.ReplaceAll(name, "..", "_")
	name = strings.ReplaceAll(name, "/", "_")
	name = strings.ReplaceAll(name, "\\", "_")
	if name == "" || name == "." {
		name = "upload.bin"
	}
	return name
}

func handleUpload(w http.ResponseWriter, r *http.Request, obsDir string) {
	if err := r.ParseMultipartForm(25 << 20); err != nil {
		writeJSONError(w, "Archivo demasiado grande o formulario inválido", http.StatusBadRequest)
		return
	}
	file, header, err := r.FormFile("file")
	if err != nil {
		file, header, err = r.FormFile("image")
		if err != nil {
			writeJSONError(w, "No se encontró el campo 'file' o 'image'", http.StatusBadRequest)
			return
		}
	}
	defer file.Close()

	// Stream a disco mientras se calcula SHA-256 (sin buffer en RAM)
	name := sanitizeFilename(header.Filename)
	ext := strings.ToLower(filepath.Ext(name))
	if ext == "" {
		ext = ".webp"
	}
	uniqueName := fmt.Sprintf("%d_%s%s", time.Now().UnixNano(), "x", ext)
	targetPath := filepath.Join(obsDir, uniqueName)

	out, err := os.Create(targetPath)
	if err != nil {
		log.Printf("[Sync Service] Error al crear archivo: %v", err)
		writeJSONError(w, "No se pudo guardar la imagen en disco", http.StatusInternalServerError)
		return
	}
	hasher := sha256.New()
	size, copyErr := io.Copy(io.MultiWriter(out, hasher), io.LimitReader(file, 25<<20+1))
	out.Close()
	if copyErr != nil || size > 25<<20 {
		os.Remove(targetPath)
		writeJSONError(w, "Archivo demasiado grande o fallo al leer datos", http.StatusBadRequest)
		return
	}
	if size == 0 {
		os.Remove(targetPath)
		writeJSONError(w, "Archivo vacío", http.StatusBadRequest)
		return
	}
	hashStr := hex.EncodeToString(hasher.Sum(nil))
	// Prefer hash-based final name
	finalName := fmt.Sprintf("%d_%s%s", time.Now().UnixNano(), hashStr[:10], ext)
	finalPath := filepath.Join(obsDir, finalName)
	if finalPath != targetPath {
		os.Rename(targetPath, finalPath)
	}

	thumbURL := ""
	thumbName := fmt.Sprintf("%d_%s_thumb.jpg", time.Now().UnixNano(), hashStr[:10])
	thumbPath := filepath.Join(obsDir, thumbName)
	if thumbErr := generateThumbnailFromFile(finalPath, thumbPath, 320); thumbErr == nil {
		thumbURL = fmt.Sprintf("/uploads/observations/%s", thumbName)
	}

	uploadsTotal.Add(1)
	resp := UploadResponse{
		Success:      true,
		URL:          fmt.Sprintf("/uploads/observations/%s", finalName),
		ThumbnailURL: thumbURL,
		FileName:     finalName,
		Size:         size,
		SHA256:       hashStr,
		Message:      "Imagen sincronizada y procesada exitosamente en Go.",
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(resp)
}

func handleBatchSync(w http.ResponseWriter, r *http.Request, cfg Config) {
	if err := r.ParseMultipartForm(50 << 20); err != nil {
		writeJSONError(w, "Lote demasiado grande o multipart inválido", http.StatusBadRequest)
		return
	}
	obsDir := filepath.Join(cfg.UploadsDir, "observations")
	syncedIDs := make([]string, 0)
	errors := make([]string, 0)
	formFiles := r.MultipartForm.File

	for fieldName, fileHeaders := range formFiles {
		if !strings.HasPrefix(fieldName, "image_") || len(fileHeaders) == 0 {
			continue
		}
		itemUUID := strings.TrimPrefix(fieldName, "image_")
		fh := fileHeaders[0]
		f, err := fh.Open()
		if err != nil {
			errors = append(errors, fmt.Sprintf("%s: no se pudo abrir archivo", itemUUID))
			continue
		}
		safeName := sanitizeFilename(fh.Filename)
		uniqueName := fmt.Sprintf("batch_%d_%s", time.Now().UnixNano(), safeName)
		targetPath := filepath.Join(obsDir, uniqueName)
		// Defense against path traversal
		if !strings.HasPrefix(filepath.Clean(targetPath), filepath.Clean(obsDir)) {
			f.Close()
			errors = append(errors, fmt.Sprintf("%s: nombre inválido", itemUUID))
			continue
		}
		out, err := os.Create(targetPath)
		if err != nil {
			f.Close()
			errors = append(errors, fmt.Sprintf("%s: fallo al crear archivo en disco", itemUUID))
			continue
		}
		_, copyErr := io.Copy(out, io.LimitReader(f, 50<<20))
		f.Close()
		out.Close()
		if copyErr != nil {
			os.Remove(targetPath)
			errors = append(errors, fmt.Sprintf("%s: error al copiar imagen", itemUUID))
			continue
		}
		syncedIDs = append(syncedIDs, itemUUID)
	}

	batchResp := BatchSyncResponse{
		Total:     len(syncedIDs) + len(errors),
		Synced:    len(syncedIDs),
		Failed:    len(errors),
		SyncedIDs: syncedIDs,
		Errors:    errors,
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(batchResp)
}

func generateThumbnailFromFile(srcPath, destPath string, targetDim int) error {
	f, err := os.Open(srcPath)
	if err != nil {
		return err
	}
	defer f.Close()
	img, _, err := image.Decode(f)
	if err != nil {
		return err
	}
	bounds := img.Bounds()
	w, h := bounds.Dx(), bounds.Dy()
	if w <= 0 || h <= 0 {
		return fmt.Errorf("dimensiones de imagen inválidas")
	}
	var newW, newH int
	if w > h {
		newH = targetDim
		newW = (w * targetDim) / h
	} else {
		newW = targetDim
		newH = (h * targetDim) / w
	}
	if newW <= 0 {
		newW = 1
	}
	if newH <= 0 {
		newH = 1
	}
	thumb := image.NewRGBA(image.Rect(0, 0, newW, newH))
	for y := 0; y < newH; y++ {
		origY := bounds.Min.Y + (y * h) / newH
		for x := 0; x < newW; x++ {
			origX := bounds.Min.X + (x * w) / newW
			thumb.Set(x, y, img.At(origX, origY))
		}
	}
	outFile, err := os.Create(destPath)
	if err != nil {
		return err
	}
	defer outFile.Close()
	return jpeg.Encode(outFile, thumb, &jpeg.Options{Quality: 80})
}

// Keep original helper for compatibility (unused but kept)
// generateThumbnail redimensiona imágenes JPEG o PNG usando muestreo proporcional puro en Go estándar
