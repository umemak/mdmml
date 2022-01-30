package mdmml

import (
	"os"
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestNewMDMML(t *testing.T) {
	type args struct {
		src []byte
	}
	tests := []struct {
		name string
		args args
		want *MDMML
	}{
		// TODO: Add test cases.
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := NewMDMML(tt.args.src)
			assert.Equal(t, tt.want, got)
		})
	}
}

func TestMDMML_SMF(t *testing.T) {
	tests := []struct {
		name     string
		filename string
		want     []byte
	}{
		{name: "normal", filename: "./testdata/test.md", want: []byte{
			// Header
			0x4D, 0x54, 0x68, 0x64, // "MThd"
			0x00, 0x00, 0x00, 0x06, // Length
			0x00, 0x01, // Format
			0x00, 0x03, // Tracks
			0x03, 0xC0, // Divisions(960)
			// Conductor
			0x4D, 0x54, 0x72, 0x6B, // "MTrk"
			0x00, 0x00, 0x00, 0x17, // Length
			0x00, 0xFF, 0x03, 0x00, // Title
			0x00, 0xFF, 0x51, 0x03, 0x06, 0x8A, 0x1B, // Tempo
			0x00, 0xFF, 0x58, 0x04, 0x04, 0x02, 0x18, 0x08, // 4/4
			0x00, 0xFF, 0x2F, 0x00, // EOT
			// Track A
			0x4D, 0x54, 0x72, 0x6B, // "MTrk"
			0x00, 0x00, 0x00, 0x2B, // Length
			0x00, 0xFF, 0x03, 0x00, // Title
			0x00, 0xFF, 0x21, 0x01, 0x00, // port
			0x00, 0xB0, 0x79, 0x00, // CC#121(Reset)
			0x00, 0xB0, 0x00, 0x00, // CC#0(MSB)
			0x00, 0xB0, 0x20, 0x00, // CC#32(LSB)
			0x00, 0xC0, 0x28, // Program Change
			0x00, 0xB0, 0x07, 0x64, // CC#7(Volume)
			0x9E, 0x00, 0x90, 0x3C, 0x64, // Note ON
			0x9E, 0x00, 0x80, 0x3C, 0x00, // Note OFF
			0x9E, 0x00, 0xFF, 0x2F, 0x00, //EOT
			// Track B
			0x4D, 0x54, 0x72, 0x6B, // "MTrk"
			0x00, 0x00, 0x00, 0x29, // Length
			0x00, 0xFF, 0x03, 0x00, // Title
			0x00, 0xFF, 0x21, 0x01, 0x00, // port
			0x00, 0xB0, 0x79, 0x00, // CC#121(Reset)
			0x00, 0xB0, 0x00, 0x00, // CC#0(MSB)
			0x00, 0xB0, 0x20, 0x00, // CC#32(LSB)
			0x00, 0xC0, 0x28, // Program Change
			0x00, 0xB0, 0x07, 0x64, // CC#7(Volume)
			0x00, 0x90, 0x3E, 0x64, // Note ON
			0x9E, 0x00, 0x80, 0x3E, 0x00, // Note OFF
			0x00, 0xFF, 0x2F, 0x00, //EOT
		}},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			src, _ := os.ReadFile(tt.filename)
			mm := NewMDMML(src)
			got := mm.SMF()
			assert.Equal(t, tt.want, got)
		})
	}
}

func TestMDtoMML(t *testing.T) {
	tests := []struct {
		name     string
		filename string
		want     *MDMML
	}{
		{name: "normal", filename: "./testdata/test.md", want: &MDMML{
			Tracks: []Track{
				{name: "A", mml: "cdefgab>cc<bagfedc"},
				{name: "B", mml: "efgab>cdeedc<bagfe"},
			},
		}},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			src, err := os.ReadFile(tt.filename)
			assert.NoError(t, err)
			got := MDtoMML(src)
			assert.Equal(t, tt.want, got)
		})
	}
}

func Test_noteOnOff(t *testing.T) {
	type args struct {
		oct  int
		note string
		vel  int
		len  int
	}
	tests := []struct {
		name string
		args args
		want []byte
	}{
		{name: "v100l8o4c", args: args{oct: 4, note: "c", vel: 100, len: 4}, want: []byte{
			0x00, 0x90, 0x3c, 0x64, // Note ON
			0x81, 0x70, 0x00, 0x80, 0x3c, 0x00, // Note OFF
		}},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mm := &MDMML{
				divisions: 960,
			}
			got := mm.noteOnOff(tt.args.oct, tt.args.note, tt.args.vel, tt.args.len)
			assert.Equal(t, tt.want, got)
		})
	}
}

func Test_itob(t *testing.T) {
	type args struct {
		i int
		f int
	}
	tests := []struct {
		name string
		args args
		want []byte
	}{
		{name: "<128", args: args{i: 127}, want: []byte{0x7f}},
		{name: "<16384", args: args{i: 16383}, want: []byte{0xff, 0x7f}},
		{name: "<2097152", args: args{i: 2097151}, want: []byte{0xff, 0xff, 0x7f}},
		{name: "<268435456", args: args{i: 268435455}, want: []byte{0xff, 0xff, 0xff, 0x7f}},
		{name: ">=268435456", args: args{i: 268435456}, want: []byte{}},
		{name: "<128 fix4", args: args{i: 127, f: 4}, want: []byte{0x00, 0x00, 0x00, 0x7f}},
		{name: "<16384 fix4", args: args{i: 16383, f: 4}, want: []byte{0x00, 0x00, 0xff, 0x7f}},
		{name: "<2097152 fix4", args: args{i: 2097151, f: 4}, want: []byte{0x00, 0xff, 0xff, 0x7f}},
		{name: "<268435456 fix4", args: args{i: 268435455, f: 4}, want: []byte{0xff, 0xff, 0xff, 0x7f}},
		{name: ">=268435456 fix4", args: args{i: 268435456, f: 4}, want: []byte{}},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := itob(tt.args.i, tt.args.f)
			assert.Equal(t, tt.want, got)
		})
	}
}

func TestMDMML_lenToTick(t *testing.T) {
	type fields struct {
		divisions int
		header    []byte
		Conductor Track
		Tracks    []Track
	}
	type args struct {
		len int
	}
	tests := []struct {
		name   string
		fields fields
		args   args
		want   int
	}{
		{name: "div960 len8", fields: fields{divisions: 960}, args: args{len: 8}, want: 120},
		{name: "div960 len4", fields: fields{divisions: 960}, args: args{len: 4}, want: 240},
		{name: "div480 len8", fields: fields{divisions: 480}, args: args{len: 8}, want: 60},
		{name: "div480 len4", fields: fields{divisions: 480}, args: args{len: 4}, want: 120},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mm := &MDMML{
				divisions: tt.fields.divisions,
				header:    tt.fields.header,
				Conductor: tt.fields.Conductor,
				Tracks:    tt.fields.Tracks,
			}
			got := mm.lenToTick(tt.args.len)
			assert.Equal(t, tt.want, got)
		})
	}
}

func Test_num(t *testing.T) {
	type args struct {
		s string
	}
	tests := []struct {
		name  string
		args  args
		want  int
		want1 int
	}{
		{name: "1桁", args: args{s: "1a"}, want: 1, want1: 1},
		{name: "2桁", args: args{s: "12a"}, want: 12, want1: 2},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, got1 := num(tt.args.s)
			if got != tt.want {
				t.Errorf("num() got = %v, want %v", got, tt.want)
			}
			if got1 != tt.want1 {
				t.Errorf("num() got1 = %v, want %v", got1, tt.want1)
			}
		})
	}
}

func TestMDMML_toSMF(t *testing.T) {
	type args struct {
		mml string
	}
	tests := []struct {
		name string
		args args
		want []byte
	}{
		{name: "normal", args: args{mml: "cde"}, want: []byte{
			0x00, 0x90, 0x24, 0x64,
			0x78, 0x00, 0x80, 0x24, 0x00,
			0x00, 0x90, 0x26, 0x64,
			0x78, 0x00, 0x80, 0x26, 0x00,
			0x00, 0x90, 0x28, 0x64,
			0x78, 0x00, 0x80, 0x28, 0x00,
		}},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mm := &MDMML{
				divisions: 960,
			}
			got := mm.toSMF(tt.args.mml, 0)
			assert.Equal(t, tt.want, got)
		})
	}
}

func Test_tempoMs(t *testing.T) {
	type args struct {
		t int
	}
	tests := []struct {
		name string
		args args
		want int
	}{
		{name: "bpm120", args: args{t: 120}, want: 500000},
		{name: "bpm140", args: args{t: 140}, want: 428571},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := tempoMs(tt.args.t); got != tt.want {
				t.Errorf("tempoMs() = %v, want %v", got, tt.want)
			}
		})
	}
}
