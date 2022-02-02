package mdmml

import (
	"bytes"
	"encoding/binary"
	"strconv"
	"strings"
)

type MDMML struct {
	divisions int
	header    []byte
	Conductor Track
	Tracks    []Track
}

type Track struct {
	name string
	mml  string
	smf  []byte
}

func (mm *MDMML) SMF() []byte {
	smf := mm.header
	smf = append(smf, mm.Conductor.smf...)
	for _, v := range mm.Tracks {
		smf = append(smf, v.smf...)
	}
	return smf
}

func MDtoMML(src []byte) *MDMML {
	mm := &MDMML{divisions: 960}
	lines := bytes.Split(src, []byte("\n"))
	for i := 0; i < len(lines); i++ {
		if string(lines[i]) == "---" { // Front Matter
			i++
			for ; i < len(lines); i++ {
				if string(lines[i]) == "---" {
					break
				}
				items := strings.Split(string(lines[i]), ":")
				if len(items) > 2 {
					items[1] = strings.Join(items[1:], ":")
				} else if len(items) != 2 {
					continue
				}
				if items[0] == "Divisions" {
					divisions, err := strconv.Atoi(items[1])
					mm.divisions = divisions
					if err != nil {
						mm.divisions = 960
					}
				}
			}
		}
		if bytes.HasPrefix(lines[i], []byte("|")) { // Table
			i++
			i++ // Skip header
			for ; i < len(lines); i++ {
				items := strings.Split(string(lines[i]), "|")
				if len(items) < 2 {
					continue
				}
				name := strings.Trim(items[1], " ")
				mml := ""
				for _, ii := range items[2:] {
					mml += strings.Trim(ii, " ")
				}
				found := false
				for i, v := range mm.Tracks {
					if v.name == name {
						mm.Tracks[i].mml += mml
						found = true
						break
					}
				}
				if !found {
					mm.Tracks = append(mm.Tracks, Track{
						name: name,
						mml:  mml,
					})
				}
			}
		}
	}
	return mm
}

func (mm *MDMML) MMLtoSMF() *MDMML {
	for i, t := range mm.Tracks {
		mm.Tracks[i].smf = mm.toSMF(t.mml, i)
	}
	mm.header = []byte{
		0x4D, 0x54, 0x68, 0x64, // "MThd"
		0x00, 0x00, 0x00, 0x06, // Length
		0x00, 0x01, // Format
	}
	mm.header = append(mm.header, itofb(len(mm.Tracks)+1, 2)...) // Tracks
	mm.header = append(mm.header, itofb(mm.divisions, 2)...)     // Divisions

	mm.Conductor = Track{
		name: "Conductor",
		smf: []byte{
			0x4D, 0x54, 0x72, 0x6B, // "MTrk"
			0x00, 0x00, 0x00, 0x17, // Length
			0x00, 0xFF, 0x03, 0x00, // Title
			0x00, 0xFF, 0x51, 0x03, 0x07, 0xA1, 0x20, // Tempo 120
			0x00, 0xFF, 0x58, 0x04, 0x04, 0x02, 0x18, 0x08, // Rhythm 4/4
			0x00, 0xFF, 0x2F, 0x00, // EOT
		},
	}
	return mm
}

func (mm *MDMML) toSMF(mml string, ch int) []byte {
	events := []byte{}
	oct := 4
	vel := 100
	defL := 8
	for i := 0; i < len(mml); i++ {
		s := string(mml[i])
		if (s >= "a" && s <= "g") || (s >= "A" && s <= "G") || (s == "r" || s == "R") { // note
			ll := defL
			if i+1 < len(mml) {
				if string(mml[i+1]) == "+" || string(mml[i+1]) == "#" {
					i++
					s = s + "+"
				} else if string(mml[i+1]) == "-" {
					i++
					s = s + "-"
				}
				o, l := num(string(mml[i+1:]))
				if l > 0 {
					i = i + l - 1
					ll = o
				}
			}
			events = append(events, mm.noteOnOff(ch, oct, s, vel, ll)...)
		} else if s == "o" || s == "O" { // octave
			if i+1 < len(mml) {
				o, l := num(string(mml[i+1:]))
				if l > 0 {
					i = i + l
					oct = o
				}
			}
		} else if s == ">" {
			oct++
		} else if s == "<" {
			oct--
		} else if s == "l" || s == "L" { // length
			if i+1 < len(mml) {
				o, l := num(string(mml[i+1:]))
				if l > 0 {
					i = i + l
					defL = o
				}
			}
		} else if s == "@" { // program
			if i+1 < len(mml) {
				o, l := num(string(mml[i+1:]))
				if l > 0 {
					i = i + l
				}
				events = append(events, mm.programChange(ch, o)...)
			}
		} else if s == "v" { // velocity
			if i+1 < len(mml) {
				o, l := num(string(mml[i+1:]))
				if l > 0 {
					i = i + l
					vel = o
				}
			}
		}
	}
	smf := []byte{0x4D, 0x54, 0x72, 0x6B}                // "MTrk"
	smf = append(smf, itofb(len(events)+26, 4)...)       // Length
	smf = append(smf, []byte{0x00, 0xFF, 0x03, 0x00}...) // Title
	smf = append(smf, []byte{0x00, 0xFF, 0x20, 0x01}...) // Channel
	smf = append(smf, itob(ch, 0)...)                    // Channel
	smf = append(smf, []byte{0x00, 0xFF, 0x21, 0x01}...) // Port
	smf = append(smf, itob(ch, 0)...)                    // Port
	smf = append(smf, []byte{0x00, 0xB0, 0x79, 0x00}...) // CC#121(Reset)
	smf = append(smf, []byte{0x00, 0xB0, 0x07, 0x64}...) // CC#7(Volume)
	smf = append(smf, events...)
	smf = append(smf, []byte{0x00, 0xFF, 0x2F, 0x00}...) //EOT
	return smf
}

func num(s string) (int, int) {
	ss := ""
	for _, v := range s {
		j := string(v)
		if j >= "0" && j <= "9" {
			ss = ss + j
		} else {
			break
		}
	}
	n, err := strconv.Atoi(ss)
	if err != nil {
		return 0, 0
	}
	return n, len(ss)
}

func (mm *MDMML) noteOnOff(ch int, oct int, note string, vel int, len int) []byte {
	cd := map[string]int{
		"c-": -1, "c": 0, "c+": 1,
		"d-": 1, "d": 2, "d+": 3,
		"e-": 3, "e": 4, "e+": 5,
		"f-": 4, "f": 5, "f+": 6,
		"g-": 6, "g": 7, "g+": 8,
		"a-": 8, "a": 9, "a+": 10,
		"b-": 10, "b": 11, "b+": 12,
	}
	ret := []byte{}
	nl := strings.ToLower(note)
	if nl == "r" {
		// on
		ret = append(ret, []byte{0x00}...)
		ret = append(ret, itofb(0x90+ch, 1)...)
		ret = append(ret, []byte{0x00, 0x00}...)
		// off
		ret = append(ret, itob(mm.lenToTick(len), 0)...)
		ret = append(ret, itofb(0x80+ch, 1)...)
		ret = append(ret, []byte{0x00, 0x00}...)
		return ret
	}
	n := (oct+1)*12 + cd[nl]
	// on
	ret = append(ret, []byte{0x00}...)
	ret = append(ret, itofb(0x90+ch, 1)...)
	ret = append(ret, itofb(n, 1)...)
	ret = append(ret, itofb(vel, 1)...)
	// off
	ret = append(ret, itob(mm.lenToTick(len), 0)...)
	ret = append(ret, itofb(0x80+ch, 1)...)
	ret = append(ret, itofb(n, 1)...)
	ret = append(ret, []byte{0x00}...)
	return ret
}

func (mm *MDMML) programChange(ch int, p int) []byte {
	ret := []byte{}
	ret = append(ret, cc(0, ch, 0, 0)...)    // CC#0(MSB)
	ret = append(ret, cc(0, ch, 0x20, 0)...) // CC#32(LSB)
	ret = append(ret, []byte{0x00}...)
	ret = append(ret, itofb(0xC0+ch, 1)...)
	ret = append(ret, itob(p-1, 0)...)
	return ret
}

func cc(dt, ch, num, val int) []byte {
	ret := []byte{}
	ret = append(ret, itob(dt, 0)...)
	ret = append(ret, itofb(0xB0+ch, 1)...)
	ret = append(ret, itofb(num, 1)...)
	ret = append(ret, itofb(val, 1)...)
	return ret
}

// itob は int を f 桁の可変長バイナリにして返す
// http://www13.plala.or.jp/kymats/study/MULTIMEDIA/midiStream_format.html
func itob(i int, f int) []byte {
	ret := []byte{}
	buf := make([]byte, binary.MaxVarintLen64)
	if i < 128 {
		for j := 1; j < f; j++ {
			ret = append(ret, 0x00)
		}
		binary.BigEndian.PutUint64(buf, uint64(i))
		ret = append(ret, buf[7:8]...)
		return ret
	}
	if i < 16384 {
		for j := 2; j < f; j++ {
			ret = append(ret, 0x00)
		}
		binary.BigEndian.PutUint64(buf, uint64((i>>7)|0x80))
		ret = append(ret, buf[7:8]...)
		binary.BigEndian.PutUint64(buf, uint64(i&0x7f))
		ret = append(ret, buf[7:8]...)
		return ret
	}
	if i < 2097152 {
		for j := 3; j < f; j++ {
			ret = append(ret, 0x00)
		}
		binary.BigEndian.PutUint64(buf, uint64((i>>14)|0x80))
		ret = append(ret, buf[7:8]...)
		binary.BigEndian.PutUint64(buf, uint64((i>>7)|0x80))
		ret = append(ret, buf[7:8]...)
		binary.BigEndian.PutUint64(buf, uint64(i&0x7f))
		ret = append(ret, buf[7:8]...)
		return ret
	}
	if i < 268435456 {
		for j := 4; j < f; j++ {
			ret = append(ret, 0x00)
		}
		binary.BigEndian.PutUint64(buf, uint64((i>>21)|0x80))
		ret = append(ret, buf[7:8]...)
		binary.BigEndian.PutUint64(buf, uint64((i>>14)|0x80))
		ret = append(ret, buf[7:8]...)
		binary.BigEndian.PutUint64(buf, uint64((i>>7)|0x80))
		ret = append(ret, buf[7:8]...)
		binary.BigEndian.PutUint64(buf, uint64(i&0x7f))
		ret = append(ret, buf[7:8]...)
		return ret
	}
	return ret
}

// itofb は int を f 桁の固定長バイナリにして返す
func itofb(i int, f int) []byte {
	ret := []byte{}
	buf := make([]byte, binary.MaxVarintLen64)
	if i < 256 {
		for j := 1; j < f; j++ {
			ret = append(ret, 0x00)
		}
		binary.BigEndian.PutUint64(buf, uint64(i))
		ret = append(ret, buf[7:8]...)
		return ret
	}
	if i < 65536 {
		for j := 2; j < f; j++ {
			ret = append(ret, 0x00)
		}
		binary.BigEndian.PutUint64(buf, uint64((i >> 8)))
		ret = append(ret, buf[7:8]...)
		binary.BigEndian.PutUint64(buf, uint64(i&0xff))
		ret = append(ret, buf[7:8]...)
		return ret
	}
	if i < 16777216 {
		for j := 3; j < f; j++ {
			ret = append(ret, 0x00)
		}
		binary.BigEndian.PutUint64(buf, uint64((i >> 16)))
		ret = append(ret, buf[7:8]...)
		binary.BigEndian.PutUint64(buf, uint64((i >> 8)))
		ret = append(ret, buf[7:8]...)
		binary.BigEndian.PutUint64(buf, uint64(i&0xff))
		ret = append(ret, buf[7:8]...)
		return ret
	}
	if i < 4294967296 {
		for j := 4; j < f; j++ {
			ret = append(ret, 0x00)
		}
		binary.BigEndian.PutUint64(buf, uint64((i >> 24)))
		ret = append(ret, buf[7:8]...)
		binary.BigEndian.PutUint64(buf, uint64((i >> 16)))
		ret = append(ret, buf[7:8]...)
		binary.BigEndian.PutUint64(buf, uint64((i >> 8)))
		ret = append(ret, buf[7:8]...)
		binary.BigEndian.PutUint64(buf, uint64(i&0xff))
		ret = append(ret, buf[7:8]...)
		return ret
	}
	return ret
}

func (mm *MDMML) lenToTick(len int) int {
	return mm.divisions * 4 / len
}

func tempoMs(t int) int {
	return 60 * 1000 * 1000 / t
}
