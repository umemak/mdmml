package mdmml

import (
	"reflect"
	"testing"
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
			if got := NewMDMML(tt.args.src); !reflect.DeepEqual(got, tt.want) {
				t.Errorf("NewMDMML() = %v, want %v", got, tt.want)
			}
		})
	}
}

func TestMDMML_Header(t *testing.T) {
	type fields struct {
		Title  string
		header []byte
		Tracks []Track
	}
	tests := []struct {
		name   string
		fields fields
		want   []byte
	}{
		{name: "normal", want: []byte{
			0x4D, 0x54, 0x68, 0x64, // "MThd"
			0x00, 0x00, 0x00, 0x06, // Length
			0x00, 0x01, // Format
			0x00, 0x03, // Tracks
			0x03, 0xC0, // Divisions(960)
		}},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mm := &MDMML{
				Title:  tt.fields.Title,
				header: tt.fields.header,
				Tracks: tt.fields.Tracks,
			}
			if got := mm.Header(); !reflect.DeepEqual(got, tt.want) {
				t.Errorf("MDMML.Header() = %v, want %v", got, tt.want)
			}
		})
	}
}

func TestMDMML_ConductorTrack(t *testing.T) {
	type fields struct {
		Title  string
		header []byte
		Tracks []Track
	}
	tests := []struct {
		name   string
		fields fields
		want   []byte
	}{
		{name: "normal", want: []byte{
			0x4D, 0x54, 0x72, 0x6B, // "MTrk"
			0x00, 0x00, 0x00, 0x17, // Length
			0x00, 0xFF, 0x03, 0x00, // Title
			0x00, 0xFF, 0x51, 0x03, 0x06, 0x8A, 0x1B, // Tempo
			0x00, 0xFF, 0x58, 0x04, 0x04, 0x02, 0x18, 0x08, // 4/4
			0x00, 0xFF, 0x2F, 0x00, // EOT
		}},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mm := &MDMML{
				Title:  tt.fields.Title,
				header: tt.fields.header,
				Tracks: tt.fields.Tracks,
			}
			if got := mm.ConductorTrack(); !reflect.DeepEqual(got, tt.want) {
				t.Errorf("MDMML.ConductorTrack() = %v, want %v", got, tt.want)
			}
		})
	}
}

func TestMDMML_TrackData(t *testing.T) {
	type fields struct {
		Title  string
		header []byte
		Tracks []Track
	}
	type args struct {
		name string
	}
	tests := []struct {
		name   string
		fields fields
		args   args
		want   []byte
	}{
		// TODO: Add test cases.
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mm := &MDMML{
				Title:  tt.fields.Title,
				header: tt.fields.header,
				Tracks: tt.fields.Tracks,
			}
			if got := mm.TrackData(tt.args.name); !reflect.DeepEqual(got, tt.want) {
				t.Errorf("MDMML.TrackData() = %v, want %v", got, tt.want)
			}
		})
	}
}

func TestMDMML_SMF(t *testing.T) {
	type fields struct {
		Title  string
		header []byte
		Tracks []Track
	}
	tests := []struct {
		name   string
		fields fields
		want   []byte
	}{
		// TODO: Add test cases.
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mm := &MDMML{
				Title:  tt.fields.Title,
				header: tt.fields.header,
				Tracks: tt.fields.Tracks,
			}
			if got := mm.SMF(); !reflect.DeepEqual(got, tt.want) {
				t.Errorf("MDMML.SMF() = %v, want %v", got, tt.want)
			}
		})
	}
}
