package mdmml

import (
	"bytes"
	"encoding/binary"
	"strconv"
	"strings"
)

var (
	MThd = []byte{0x4D, 0x54, 0x68, 0x64}
	MTrk = []byte{0x4D, 0x54, 0x72, 0x6B}
	EOT  = []byte{0x00, 0xFF, 0x2F, 0x00}
)

type MDMML struct {
	divisions int
	title     string
	tempo     int
	header    []byte
	Conductor Track
	Tracks    []Track
}

type Track struct {
	name string
	mmls []string
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
	mm := &MDMML{
		divisions: 960,
		tempo:     120,
	}
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
					mm.divisions = atoi(items[1], 960)
				}
				if items[0] == "Tempo" {
					mm.tempo = atoi(items[1], 120)
				}
				if items[0] == "Title" {
					mm.title = strings.TrimSpace(items[1])
				}
			}
		}
		if bytes.HasPrefix(lines[i], []byte("|")) { // Table
			i++
			i++ // Skip header
			for ; i < len(lines); i++ {
				if strings.TrimSpace(string(lines[i])) == "" {
					break
				}
				if bytes.HasPrefix(lines[i], []byte(";")) { // Comment
					continue
				}
				items := strings.Split(string(lines[i]), "|")
				if len(items) < 3 {
					continue
				}
				name := strings.Trim(items[1], " ")
				mmls := []string{}
				for _, ii := range items[2 : len(items)-1] {
					mmls = append(mmls, strings.Trim(ii, " "))
				}
				found := false
				for i, v := range mm.Tracks {
					if v.name == name {
						mm.Tracks[i].mmls = append(mm.Tracks[i].mmls, mmls...)
						found = true
						break
					}
				}
				if !found {
					mm.Tracks = append(mm.Tracks, Track{
						name: name,
						mmls: mmls,
					})
				}
			}
		}
	}
	return mm
}

func (mm *MDMML) MMLtoSMF() *MDMML {
	for i, t := range mm.Tracks {
		events := toEvents(expand(strings.Join(t.mmls, "")), i, mm.divisions)
		mm.Tracks[i].smf = buildSMF(t.name, events, i)
	}
	mm.header = MThd
	mm.header = append(mm.header, []byte{0x00, 0x00, 0x00, 0x06}...) // Length
	mm.header = append(mm.header, []byte{0x00, 0x01}...)             // Format
	mm.header = append(mm.header, itofb(len(mm.Tracks)+1, 2)...)     // Tracks
	mm.header = append(mm.header, itofb(mm.divisions, 2)...)         // Divisions

	title := buildTitle(mm.title)
	tempo := buildTempo(mm.tempo)
	smf := MTrk // "MTrk"
	smf = append(smf, itofb(len(title)+len(tempo)+12, 4)...)
	smf = append(smf, title...)
	smf = append(smf, tempo...)
	smf = append(smf, []byte{0x00, 0xFF, 0x58, 0x04, 0x04, 0x02, 0x18, 0x08}...) // Rhythm 4/4
	smf = append(smf, EOT...)                                                    // EOT
	mm.Conductor = Track{
		name: "Conductor",
		smf:  smf,
	}
	return mm
}

type loop struct {
	pos   int
	count int
}

// chode
type note struct {
	num int
	vel int
}

func expand(mml string) string {
	res := ""
	loops := []loop{}
	mml = strings.ReplaceAll(mml, " ", "")
	mml += "   " // インデックス超過対策
	for i := 0; i < len(mml); i++ {
		s := string(mml[i])
		if s == " " {
			break
		}
		if s == "[" { // loop begin
			loops = append(loops, loop{pos: i, count: -1})
		} else if s == "]" { // loop end
			v, l := num(mml[i+1:], 1, 128)
			c := 2
			if l > 0 {
				i = i + l
				c = v
			}
			lp := len(loops) - 1
			if loops[lp].count == -1 {
				loops[lp].count = c
			}
			if loops[lp].count > 1 {
				loops[lp].count--
				i = loops[lp].pos
			} else {
				if lp > 0 {
					loops = loops[:lp-1]
				}
			}
		} else {
			res += s
		}
	}
	return res
}

func toEvents(mml string, ch, div int) []byte {
	events := []byte{}
	oct := 4
	vel := 100
	defTick := lenToTick(div, 8)
	mml = strings.ToLower(mml)
	mml = strings.ReplaceAll(mml, " ", "")
	mml = strings.ReplaceAll(mml, "#", "+")
	mml += "   " // インデックス超過対策
	for i := 0; i < len(mml); i++ {
		s := string(mml[i])
		if s == " " {
			break
		}
		if (s >= "a" && s <= "g") || (s == "r") { // note
			tick := defTick
			if string(mml[i+1]) == "+" {
				i++
				s = s + "+"
			} else if string(mml[i+1]) == "-" {
				i++
				s = s + "-"
			}
			v, l := num(mml[i+1:], 1, div)
			if l > 0 {
				i = i + l
				tick = lenToTick(div, v)
			}
			if string(mml[i+1]) == "." {
				i++
				tick = int(float64(tick) * 1.5)
			}
			for {
				if string(mml[i+1]) != "^" {
					break
				}
				i++
				tick2 := 0
				v, l := num(mml[i+1:], 1, div)
				if l > 0 {
					i = i + l
					tick2 = lenToTick(div, v)
				}
				if string(mml[i+1]) == "." {
					i++
					tick2 = int(float64(tick) * 1.5)
				}
				tick += tick2
			}
			events = append(events, noteOnOff(ch, oct, s, vel, tick)...)
		} else if s == "{" { // chode
			cp := strings.Index(mml[i+1:], "}")
			cmml := mml[i+1:i+cp+1] + "   "
			i = i + cp + 1
			notes := []note{}
			o := oct
			for j := 0; j < len(cmml); j++ {
				s := string(cmml[j])
				if s == " " {
					break
				}
				if string(cmml[j+1]) == "+" {
					j++
					s = s + "+"
				} else if string(cmml[j+1]) == "-" {
					j++
					s = s + "-"
				} else if s == ">" {
					o++
					continue
				} else if s == "<" {
					o--
					continue
				}
				n := noteNum(o, s)
				notes = append(notes, note{num: n, vel: vel})
			}
			tick := defTick
			v, l := num(mml[i+1:], 1, div)
			if l > 0 {
				i = i + l
				tick = lenToTick(div, v)
			}
			if string(mml[i+1]) == "." {
				i++
				tick = int(float64(tick) * 1.5)
			}
			for {
				if string(mml[i+1]) != "^" {
					break
				}
				i++
				tick2 := 0
				v, l := num(mml[i+1:], 1, div)
				if l > 0 {
					i = i + l
					tick2 = lenToTick(div, v)
				}
				if string(mml[i+1]) == "." {
					i++
					tick2 = int(float64(tick) * 1.5)
				}
				tick += tick2
			}
			events = append(events, notesOnOff(ch, notes, tick)...)
		} else if s == "o" { // octave
			v, l := num(mml[i+1:], 1, 8)
			if l > 0 {
				i = i + l
				oct = v
			}
		} else if s == ">" {
			oct++
		} else if s == "<" {
			oct--
		} else if s == "l" { // length
			v, l := num(mml[i+1:], 1, div)
			if l > 0 {
				i = i + l
				defTick = lenToTick(div, v)
			}
		} else if s == "@" { // program
			v, l := num(mml[i+1:], 1, 128)
			if l > 0 {
				i = i + l
			}
			events = append(events, programChange(ch, v)...)
		} else if s == "p" { // pan
			v, l := num(mml[i+1:], 0, 127)
			if l > 0 {
				i = i + l
			}
			events = append(events, cc(0, ch, 10, v)...)
		} else if s == "t" { // tempo
			v, l := num(mml[i+1:], 1, 960)
			if l > 0 {
				i = i + l
			}
			events = append(events, buildTempo(v)...)
		} else if s == "v" { // velocity
			v, l := num(mml[i+1:], 0, 127)
			if l > 0 {
				i = i + l
				vel = v
			}
		} else if s == "$" { // channel
			v, l := num(mml[i+1:], 1, 16)
			if l > 0 {
				i = i + l
				ch = v - 1
			}
		}
	}
	return events
}

func buildSMF(title string, events []byte, ch int) []byte {
	body := []byte{}
	body = append(body, buildTitle(title)...)              // Title
	body = append(body, []byte{0x00, 0xFF, 0x20, 0x01}...) // Channel
	body = append(body, itob(ch, 0)...)                    // Channel
	body = append(body, []byte{0x00, 0xFF, 0x21, 0x01}...) // Port
	body = append(body, itob(ch, 0)...)                    // Port
	body = append(body, cc(0, ch, 121, 0)...)              // CC#121(Reset)
	body = append(body, cc(0, ch, 7, 100)...)              // CC#7(Volume)
	body = append(body, events...)
	body = append(body, EOT...) //EOT

	smf := MTrk                               // "MTrk"
	smf = append(smf, itofb(len(body), 4)...) // Length
	smf = append(smf, body...)
	return smf
}

func num(s string, min, max int) (int, int) {
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
	if n < min {
		n = min
	}
	if n > max {
		n = max
	}
	return n, len(ss)
}

func noteOnOff(ch int, oct int, note string, vel int, tick int) []byte {
	ret := []byte{}
	if note == "r" {
		// 無音を再生
		ret = append(ret, event(0, 0x90+ch, 0, 0)...)    // on
		ret = append(ret, event(tick, 0x80+ch, 0, 0)...) // off
		return ret
	}
	n := noteNum(oct, note)
	ret = append(ret, event(0, 0x90+ch, n, vel)...)  // on
	ret = append(ret, event(tick, 0x80+ch, n, 0)...) // off
	return ret
}

func notesOnOff(ch int, notes []note, tick int) []byte {
	ret := []byte{}
	for _, n := range notes {
		ret = append(ret, event(0, 0x90+ch, n.num, n.vel)...) // on
	}
	for i, n := range notes {
		if i == 0 {
			ret = append(ret, event(tick, 0x80+ch, n.num, 0)...) // off
		} else {
			ret = append(ret, event(0, 0x80+ch, n.num, 0)...) // off
		}
	}
	return ret
}

func noteNum(oct int, note string) int {
	cd := map[string]int{
		"c-": -1, "c": 0, "c+": 1,
		"d-": 1, "d": 2, "d+": 3,
		"e-": 3, "e": 4, "e+": 5,
		"f-": 4, "f": 5, "f+": 6,
		"g-": 6, "g": 7, "g+": 8,
		"a-": 8, "a": 9, "a+": 10,
		"b-": 10, "b": 11, "b+": 12,
	}
	if note == "r" {
		return -1
	}
	val, ok := cd[note]
	if !ok {
		return 0
	}
	return (oct+1)*12 + val
}

func event(dt, ev, n, vel int) []byte {
	ret := []byte{}
	ret = append(ret, itob(dt, 0)...)
	ret = append(ret, itofb(ev, 1)...)
	ret = append(ret, itofb(n, 1)...)
	ret = append(ret, itofb(vel, 1)...)
	return ret
}

func programChange(ch int, p int) []byte {
	ret := []byte{}
	ret = append(ret, cc(0, ch, 0, 0)...)  // CC#0(MSB)
	ret = append(ret, cc(0, ch, 32, 0)...) // CC#32(LSB)
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
	if i < 128*128 {
		for j := 2; j < f; j++ {
			ret = append(ret, 0x00)
		}
		binary.BigEndian.PutUint64(buf, uint64((i>>7)|0x80))
		ret = append(ret, buf[7:8]...)
		binary.BigEndian.PutUint64(buf, uint64(i&0x7f))
		ret = append(ret, buf[7:8]...)
		return ret
	}
	if i < 128*128*128 {
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
	if i < 128*128*128*128 {
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
	if i < 256*256 {
		for j := 2; j < f; j++ {
			ret = append(ret, 0x00)
		}
		binary.BigEndian.PutUint64(buf, uint64((i >> 8)))
		ret = append(ret, buf[7:8]...)
		binary.BigEndian.PutUint64(buf, uint64(i&0xff))
		ret = append(ret, buf[7:8]...)
		return ret
	}
	if i < 256*256*256 {
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
	if i < 256*256*256*256 {
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

func lenToTick(div, len int) int {
	return div * 4 / len
}

func tempoMs(t int) int {
	if t == 0 {
		return 0
	}
	return 60 * 1000 * 1000 / t
}

func atoi(a string, def int) int {
	ret, err := strconv.Atoi(a)
	if err != nil {
		return def
	}
	return ret
}

func buildTitle(title string) []byte {
	ret := []byte{0x00, 0xff, 0x03}
	ret = append(ret, itofb(len(title), 1)...)
	ret = append(ret, []byte(title)...)
	return ret
}

func buildTempo(tempo int) []byte {
	ret := []byte{0x00, 0xff, 0x51, 0x03}
	ret = append(ret, itofb(tempoMs(tempo), 3)...)
	return ret
}
