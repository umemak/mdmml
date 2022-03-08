package main

import (
	"os"
	"testing"
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
