package main

import (
	"fmt"
	"os"

	"github.com/umemak/mdmml"
)

func main() {
	src, err := os.ReadFile(os.Args[0])
	if err != nil {
		fmt.Printf("%+v\n", err)
		os.Exit(1)
	}
	mm := mdmml.NewMDMML(src)
	os.Stdout.Write(mm.SMF())
}
