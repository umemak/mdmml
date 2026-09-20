import React, { useState } from 'react';
import { HelpCircle, ChevronDown, ChevronUp } from 'lucide-react';

export const CheatSheet: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden transition-all duration-200">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-3 flex items-center justify-between text-left text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800/50 transition-colors"
      >
        <div className="flex items-center space-x-2">
          <HelpCircle className="w-4 h-4 text-indigo-400" />
          <span>MML 記法 & Markdown チートシート</span>
        </div>
        {isOpen ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
      </button>

      {isOpen && (
        <div className="p-4 border-t border-slate-800 text-xs text-slate-300 space-y-4 bg-slate-950/60">
          <div>
            <h4 className="font-semibold text-slate-100 mb-1.5">Markdown テーブル構造</h4>
            <ul className="list-disc list-inside space-y-1 text-slate-400">
              <li>表の1列目が<strong>パート名（トラック名）</strong>になります。</li>
              <li>2列目以降に各小節の MML を記述します。</li>
              <li>同じパート名の行は、上から順に連結されて演奏されます。</li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-slate-100 mb-2">MML コマンド一覧</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse border border-slate-800">
                <thead>
                  <tr className="bg-slate-900 text-slate-200">
                    <th className="p-2 border border-slate-800">コマンド</th>
                    <th className="p-2 border border-slate-800">意味</th>
                    <th className="p-2 border border-slate-800">例・備考</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  <tr>
                    <td className="p-2 font-mono text-cyan-400 border border-slate-800">c d e f g a b</td>
                    <td className="p-2 border border-slate-800">音階（ドレミファソラシ）</td>
                    <td className="p-2 text-slate-400 border border-slate-800">音長を付与可能 (c4, d8 など)</td>
                  </tr>
                  <tr>
                    <td className="p-2 font-mono text-cyan-400 border border-slate-800">+, # / -</td>
                    <td className="p-2 border border-slate-800">半音上げ / 半音下げ</td>
                    <td className="p-2 text-slate-400 border border-slate-800">音階の直後に記述 (c+, f-)</td>
                  </tr>
                  <tr>
                    <td className="p-2 font-mono text-cyan-400 border border-slate-800">. / ^</td>
                    <td className="p-2 border border-slate-800">付点 / タイ</td>
                    <td className="p-2 text-slate-400 border border-slate-800">c4. (付点4分), c4^c8 (タイ)</td>
                  </tr>
                  <tr>
                    <td className="p-2 font-mono text-cyan-400 border border-slate-800">r</td>
                    <td className="p-2 border border-slate-800">休符</td>
                    <td className="p-2 text-slate-400 border border-slate-800">r4 (4分休符), r1 (全休符)</td>
                  </tr>
                  <tr>
                    <td className="p-2 font-mono text-cyan-400 border border-slate-800">l</td>
                    <td className="p-2 border border-slate-800">デフォルト音長</td>
                    <td className="p-2 text-slate-400 border border-slate-800">l8 (省略時8分音符), l4 (4分音符)</td>
                  </tr>
                  <tr>
                    <td className="p-2 font-mono text-cyan-400 border border-slate-800">o / &gt; / &lt;</td>
                    <td className="p-2 border border-slate-800">オクターブ指定 / 1上げ / 1下げ</td>
                    <td className="p-2 text-slate-400 border border-slate-800">o4 (基準4), &gt;c&lt;c</td>
                  </tr>
                  <tr>
                    <td className="p-2 font-mono text-cyan-400 border border-slate-800">v</td>
                    <td className="p-2 border border-slate-800">ベロシティ (音量)</td>
                    <td className="p-2 text-slate-400 border border-slate-800">v0 〜 v127</td>
                  </tr>
                  <tr>
                    <td className="p-2 font-mono text-cyan-400 border border-slate-800">@</td>
                    <td className="p-2 border border-slate-800">音色 (Program Change)</td>
                    <td className="p-2 text-slate-400 border border-slate-800">@1 〜 @128 (GM規格音色)</td>
                  </tr>
                  <tr>
                    <td className="p-2 font-mono text-cyan-400 border border-slate-800">t</td>
                    <td className="p-2 border border-slate-800">テンポ</td>
                    <td className="p-2 text-slate-400 border border-slate-800">t120 (BPM 120)</td>
                  </tr>
                  <tr>
                    <td className="p-2 font-mono text-cyan-400 border border-slate-800">[ ... ]N</td>
                    <td className="p-2 border border-slate-800">繰り返し</td>
                    <td className="p-2 text-slate-400 border border-slate-800">[cdef]2 で2回反復</td>
                  </tr>
                  <tr>
                    <td className="p-2 font-mono text-cyan-400 border border-slate-800">{`{ ... }`}</td>
                    <td className="p-2 border border-slate-800">和音 (Chord)</td>
                    <td className="p-2 text-slate-400 border border-slate-800">{`{ceg}4 (ドミソ和音)`}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
