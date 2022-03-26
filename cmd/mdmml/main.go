package main

import (
	"flag"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"

	"github.com/umemak/mdmml"
)

func main() {
	flag.Parse()
	err := run(flag.Arg(0))
	if err != nil {
		fmt.Printf("%+v\n", err)
		os.Exit(1)
	}
}

func run(fname string) error {
	src, err := read(fname)
	if err != nil {
		return err
	}
	_, err = os.Stdout.Write(mdmml.MDtoMML(src).MMLtoSMF().SMF())
	if err != nil {
		return err
	}
	return nil
}

func read(fname string) ([]byte, error) {
	if _, err := url.ParseRequestURI(fname); err == nil {
		return download(fname)
	}
	return os.ReadFile(fname)
}

func download(url string) ([]byte, error) {
	resp, err := http.Get(url)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	return io.ReadAll(resp.Body)
}
