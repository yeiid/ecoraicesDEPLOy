package main

import (
	"bytes"
	"crypto/sha256"
	"encoding/hex"
	"io"
	"testing"
)

func BenchmarkSHA256(b *testing.B) {
	data := make([]byte, 1<<20)
	for i := range data {
		data[i] = byte(i)
	}
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		h := sha256.Sum256(data)
		_ = hex.EncodeToString(h[:])
	}
}

func BenchmarkWrite(b *testing.B) {
	var buf bytes.Buffer
	data := make([]byte, 1<<18)
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		buf.Reset()
		_, _ = buf.Write(data)
	}
}

func BenchmarkCopy(b *testing.B) {
	src := bytes.NewReader(make([]byte, 1<<20))
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		src.Reset()
		h := sha256.New()
		_, _ = io.Copy(io.Discard, io.MultiWriter(io.Discard, h), nil)
		_ = h
	}
}
