import re, json, sys
from pypdf import PdfReader

# Folder holding the owner's PDFs; pass the output path as the first argument.
DL = (sys.argv[2] if len(sys.argv) > 2 else r'C:/Users/mohit/Downloads') + '/'
OUT = sys.argv[1]
SECTION_TOPIC = {'A': 'math', 'B': 'reasoning', 'C': 'verbal', 'D': 'pseudocode', 'E': 'puzzle'}
LET = 'ABCD'

def lines_of(path, drop):
    out = []
    for page in PdfReader(path).pages:
        for ln in page.extract_text().split('\n'):
            if any(re.match(d, ln.strip()) for d in drop):
                continue
            out.append(ln.rstrip())
    return out

PRE = re.compile(r'^(Refer to |Passage \d|The next |Questions in this set|Section [A-F]:)')

def parse_paper(path, set_no):
    L = lines_of(path, [r'^Infosys SE Guess Paper', r'^Page \d+ of \d+'])
    qs, i, topic, context, pending = [], 0, None, '', []
    while i < len(L):
        ln = L[i].strip()
        m = re.match(r'^Section ([A-F]):', ln)
        if m:
            topic = SECTION_TOPIC.get(m.group(1)); context = ''; pending = []; i += 1; continue
        if topic is None:
            i += 1; continue
        mq = re.match(r'^Q(\d+)\.\s*(.*)$', ln)
        if not mq:
            pending.append(L[i]); i += 1; continue
        # preamble lines collected since the last question
        pre = '\n'.join(x for x in pending if not re.match(r'^(\d+ questions|Refer to )', x.strip())).strip()
        if pre and not re.match(r'^Refer to', pre):
            context = pre
        refers = any(re.match(r'^Refer to', x.strip()) for x in pending)
        starts_group = bool(pre)
        pending = []
        num = int(mq.group(1)); text = [mq.group(2)]; i += 1
        while i < len(L) and not re.match(r'^\(A\)', L[i].strip()):
            text.append(L[i]); i += 1
        opts = []
        while i < len(L) and len(opts) < 4:
            mo = re.match(r'^\(([A-D])\)\s*(.*)$', L[i].strip())
            if mo: opts.append(mo.group(2))
            elif opts: opts[-1] += ' ' + L[i].strip()
            i += 1
        ans, expl, trick = None, [], []
        mode = None
        while i < len(L):
            s = L[i].strip()
            if re.match(r'^Q\d+\.', s) or PRE.match(s): break
            ma = re.match(r'^Correct Answer:\s*\(([A-D])\)', s)
            if ma: ans = LET.index(ma.group(1)); mode = None
            elif s.startswith('Explanation:'): mode = 'e'; expl.append(s[12:].strip())
            elif s.startswith('Memory Trick:'): mode = 't'; trick.append(s[13:].strip())
            elif mode == 'e': expl.append(s)
            elif mode == 't': trick.append(s)
            i += 1
        qtext = '\n'.join(text).strip()
        is_code = topic == 'pseudocode'
        if is_code: qtext = re.sub(r'(pseudocode\?(?:\s*\(Integer division is used for /\.\))?)\s*', lambda m: m.group(1) + chr(10) + chr(10), qtext, 1)
        if (refers or starts_group or qtext.startswith('(Same arrangement)') or qtext.startswith('(Refer')) and context and topic in ('math', 'reasoning', 'verbal'):
            qtext = context + '\n\n' + qtext
        qs.append({
            'source': f'Guess Paper Set-{set_no} Q{num}', 'topic': topic, 'difficulty': 'intermediate',
            'question': qtext, 'options': opts, 'correct': ans,
            'explanation': ' '.join(expl).strip() + ('\n\nMemory trick: ' + ' '.join(trick).strip() if trick else ''),
            'code': is_code,
        })
    return qs

def parse_pseudo(path):
    L = lines_of(path, [])
    qs, i = [], 0
    DIFF = {'Easy': 'beginner', 'Medium': 'intermediate', 'Difficult': 'advanced'}
    while i < len(L):
        m = re.match(r'^Set (\d+) · Q(\d+): (.*)$', L[i].strip())
        if not m: i += 1; continue
        src = f'Pseudocode Set-{m.group(1)} Q{m.group(2)}'
        i += 1
        diff = 'intermediate'
        code, opts, correct, fields = [], [], None, {}
        while i < len(L) and 'Code Snippet' not in L[i]:
            md = re.match(r'^(Easy|Medium|Difficult) \|', L[i].strip())
            if md: diff = DIFF[md.group(1)]
            i += 1
        i += 1
        while i < len(L) and not re.match(r'^[A-D] ', L[i].strip()):
            code.append(L[i].rstrip()); i += 1
        while i < len(L) and len(opts) < 4 and re.match(r'^[A-D] ', L[i].strip()):
            t = L[i].strip()[2:]
            if '(Correct Answer)' in t: correct = len(opts); t = t.replace('(Correct Answer)', '').strip()
            opts.append(t); i += 1
        key = None
        while i < len(L) and not re.match(r'^Set \d+ · Q\d+:', L[i].strip()):
            s = L[i].strip()
            mk = re.match(r'^(Common Trap|Cheat Code/Formula|Key Learning|Core Rule):\s*(.*)$', s)
            if mk: key = mk.group(1); fields[key] = mk.group(2)
            elif key and s: fields[key] += ' ' + s
            i += 1
        # code text often wraps a long print line; keep as-is
        expl = ' '.join(x for x in [fields.get('Cheat Code/Formula', ''), fields.get('Key Learning', '')] if x)
        if fields.get('Common Trap'): expl += f"\n\nCommon trap: {fields['Common Trap']}"
        if fields.get('Core Rule'): expl += f"\nCore rule: {fields['Core Rule']}"
        qs.append({'source': src, 'topic': 'pseudocode', 'difficulty': diff,
                   'question': 'What is the output of the following pseudocode?\n\n' + '\n'.join(code).strip(),
                   'options': opts, 'correct': correct, 'explanation': expl.strip(), 'code': True})
    return qs

def unwrap(text):
    """Rejoin prose lines the PDF wrapped (long lines); keep short lines such as table rows and grids."""
    out, prev = [], ''
    for ln in text.split(chr(10)):
        if out and len(prev) >= 80 and ln.strip() and not prev.endswith(':') and not ln.strip().startswith('Year '):
            out[-1] = out[-1].rstrip() + ' ' + ln.strip()
        else:
            out.append(ln)
        prev = ln
    return chr(10).join(out)

papers = parse_paper(DL + 'Infosys_SE_Guess_Paper_Set-3.pdf', 3) + parse_paper(DL + 'Infosys_SE_Guess_Paper_Set-4.pdf', 4)

# Sudoku grids lose their empty cells in PDF text: restate them row by row.
GRIDS = {
    'Guess Paper Set-3 Q54': '_ 3 1 _\n1 _ 4 _\n3 4 ? _\n_ _ _ _',
    'Guess Paper Set-4 Q54': '_ 1 3 _\n_ 3 _ 2\n_ _ ? _\n_ _ 2 1',
}
for q in papers:
    if q['source'] in GRIDS:
        head = q['question'].split('(?)')[0] + '(?)?'
        q['question'] = head + '\n\nGrid (_ = empty):\n' + GRIDS[q['source']]

norm = lambda s: re.sub(r'\s+', '', s.split('\n\n', 1)[-1])
seen = {norm(q['question']) for q in papers if q['topic'] == 'pseudocode'}
pseudo = [q for q in parse_pseudo(DL + 'Infosys_SE_Pseudocode_Problems_All_Sets.pdf') if norm(q['question']) not in seen]
allq = papers + pseudo
for q in allq:
    if not q['code']: q['question'] = unwrap(q['question'])
    q['explanation'] = unwrap(q['explanation'])
bad = [q['source'] for q in allq if len(q['options']) != 4 or q['correct'] is None or not q['question']]
json.dump(allq, open(OUT, 'w', encoding='utf-8', newline='\n'), ensure_ascii=False, indent=1)
from collections import Counter
print(len(allq), dict(Counter(q['topic'] for q in allq)), 'bad:', bad)
