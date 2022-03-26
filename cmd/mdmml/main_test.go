package main

import (
	"os"
	"testing"

	"github.com/stretchr/testify/assert"
)

func Test_main(t *testing.T) {
	tests := []struct {
		name string
	}{
		{name: "normal"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			os.Args[1] = "../../testdata/test.md"
			main()
		})
	}
}

func Test_run(t *testing.T) {
	type args struct {
		fname string
	}
	tests := []struct {
		name    string
		args    args
		wantErr bool
	}{
		{name: "normal", args: args{fname: "../../testdata/test.md"}},
		{name: "not found", args: args{fname: "notfound"}, wantErr: true},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if err := run(tt.args.fname); (err != nil) != tt.wantErr {
				t.Errorf("run() error = %v, wantErr %v", err, tt.wantErr)
			}
		})
	}
}

func Test_read(t *testing.T) {
	testmd, _ := os.ReadFile("../../testdata/test.md")
	type args struct {
		fname string
	}
	tests := []struct {
		name    string
		args    args
		want    []byte
		wantErr bool
	}{
		{name: "local", args: args{fname: "../../testdata/test.md"}, want: testmd},
		{name: "remote", args: args{fname: "https://raw.githubusercontent.com/umemak/mdmml/main/testdata/test.md"}, want: testmd},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := read(tt.args.fname)
			if (err != nil) != tt.wantErr {
				t.Errorf("read() error = %v, wantErr %v", err, tt.wantErr)
				return
			}
			assert.Equal(t, tt.want, got)
		})
	}
}

func Test_download(t *testing.T) {
	testmd, _ := os.ReadFile("../../testdata/test.md")
	type args struct {
		url string
	}
	tests := []struct {
		name    string
		args    args
		want    []byte
		wantErr bool
	}{
		{name: "normal", args: args{url: "https://raw.githubusercontent.com/umemak/mdmml/main/testdata/test.md"},
			want: testmd},
		{name: "not found", args: args{url: "https://raw.githubusercontent.com/umemak/mdmml/main/testdata/test.mdx"},
			want: []byte("404: Not Found")},
		{name: "empty", wantErr: true},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := download(tt.args.url)
			if (err != nil) != tt.wantErr {
				t.Errorf("download() error = %v, wantErr %v", err, tt.wantErr)
				return
			}
			assert.Equal(t, tt.want, got)
		})
	}
}
