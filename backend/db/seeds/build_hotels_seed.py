"""Build db/seeds/hotels.seed.json from the "HOTEL RATES" workbook.

Usage (from backend/):
    python db/seeds/build_hotels_seed.py "/path/to/HOTEL RATES.xlsx"
    python -m app.seed_hotels            # load the JSON into the database

Each sheet is a region. A hotel block is: name row (col B, star rating in C-H),
contact row, a currency row (KSHS. / $ USD.) holding period headers, then
P.P SHARING / SINGLE / TRIPPLE rows. Periods are mapped to calendar months;
22 Dec - 2 Jan columns become the "festive" rate. Copy-pasted template rows
(identical partial-year figures repeated across many hotels) are discarded so
those hotels are listed without a price rather than with a fake one.
"""
import openpyxl, re, json, datetime
import sys, pathlib
HERE=pathlib.Path(__file__).resolve().parent
SRC=sys.argv[1] if len(sys.argv)>1 else sys.exit("usage: python build_hotels_seed.py \"HOTEL RATES.xlsx\"")
wb=openpyxl.load_workbook(SRC,data_only=True)

REGIONS = {  # xlsx title -> (country, display region)
 "NAIROBI":("kenya","Nairobi"),"SOUTH COAST DAINI":("kenya","South Coast (Diani)"),"NORTH COAST":("kenya","North Coast"),
 "MALINDIWATAMU":("kenya","Malindi & Watamu"),"LAMU":("kenya","Lamu"),"NAIVASHA":("kenya","Naivasha"),
 "ELEMENTAITANAKURU":("kenya","Elementaita & Nakuru"),"NANYUKIABADARESMT. KENYAOLPAJET":("kenya","Nanyuki, Aberdares, Mt. Kenya & Ol Pejeta"),
 "MAASAI MARA":("kenya","Maasai Mara"),"SAMBURU":("kenya","Samburu"),"AMBOSLI":("kenya","Amboseli"),"TSAVO EAST":("kenya","Tsavo East"),
 "TSAVO WEST":("kenya","Tsavo West"),"KISUMU":("kenya","Kisumu"),"ELDORET":("kenya","Eldoret"),"KITALE":("kenya","Kitale"),
 "SHAMPOLE":("kenya","Shompole"),"LAIKIPIA":("kenya","Laikipia"),"MERU":("kenya","Meru"),"BARINGO":("kenya","Baringo"),
 "BOGORIA":("kenya","Bogoria"),"KAKAMEGA":("kenya","Kakamega"),"KERICHO":("kenya","Kericho"),"NYAHURURU":("kenya","Nyahururu"),
 "TURKANA-LODWAR":("kenya","Turkana (Lodwar)"),"MARSABIT":("kenya","Marsabit"),
 "ARUSHA":("tanzania","Arusha"),"DAR ES SALAAM":("tanzania","Dar es Salaam"),"SERENGETI":("tanzania","Serengeti"),
 "TARANGIRE":("tanzania","Tarangire"),"NGORONGORO":("tanzania","Ngorongoro"),"ZANZIBAR":("tanzania","Zanzibar"),
 "SONGO SONGO ISLAND":("tanzania","Songo Songo Island"),"MAFIA ISLAND":("tanzania","Mafia Island"),"PEMBA ISLAND":("tanzania","Pemba Island"),
 "KARATU":("tanzania","Karatu"),"SELOUS":("tanzania","Selous (Nyerere)"),"MANYARA":("tanzania","Lake Manyara"),
 "MT. KILIMANJARO":("tanzania","Mt. Kilimanjaro"),"KILWA MASOKO":("tanzania","Kilwa Masoko"),"MKOMAZI":("tanzania","Mkomazi"),
 "KATAVI":("tanzania","Katavi"),"MIKUMI":("tanzania","Mikumi"),"MAHALE":("tanzania","Mahale"),"RUAHA":("tanzania","Ruaha"),
 "KIGOMA":("tanzania","Kigoma"),"SINGITA GRUMETI":("tanzania","Singita Grumeti"),"LAKE NATRON":("tanzania","Lake Natron"),
 "LAKE EYASI":("tanzania","Lake Eyasi"),"KAMPALA":("uganda","Kampala"),
}
MONTHS={"JAN":1,"FEB":2,"MAR":3,"APR":4,"MAY":5,"JUN":6,"JUL":7,"AUG":8,"SEP":9,"OCT":10,"NOV":11,"DEC":12}
def months_in(label):
    """Return (list_of_months, festive_bool) for a period header."""
    if isinstance(label,(datetime.datetime,datetime.date)):
        return [label.month], False
    s=str(label).upper()
    if re.search(r"XMAS|CHRISTMAS|EASTER",s): return [], ("EASTER" not in s)
    if "JANUARY TO DECEMBER" in s or "ALL YEAR" in s: return list(range(1,13)), False
    found=[MONTHS[m.group(1)[:3]] for m in re.finditer(r"(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)[A-Z]*",s)]
    if not found: return [], False
    if len(found)>=2 and "-" in s or " TO " in s and len(found)>=2:
        a,b=found[0],found[-1]
        if a==12 and b==1: return [], True          # 22 DEC - 2 JAN festive window
        if a<=b: return list(range(a,b+1)), False
        return list(range(a,13))+list(range(1,b+1)), False
    return found, False

ROOM={"P.P SHARING":"sharing","PP SHARING":"sharing","P.P.SHARING":"sharing","SHARING":"sharing","DOUBLE":"sharing",
      "SINGLE":"single","TRIPPLE":"triple","TRIPLE":"triple"}
def room_key(a):
    a=re.sub(r"\s+"," ",str(a or "").strip().upper())
    return ROOM.get(a)
def cur_of(a):
    a=str(a or "").upper()
    if "KSH" in a or "KES" in a: return "KES"
    if "USD" in a or "$" in a: return "USD"
    return None
def num(v):
    if isinstance(v,(int,float)) and not isinstance(v,bool): return float(v)
    return None

def clean_name(n):
    n=re.sub(r"^\s*\d+\s*[.)]\s*","",str(n)).strip()
    n=re.sub(r"\s+"," ",n)
    return n
def meal_plan(n):
    m=re.search(r"\((H\.?B|F\.?B|A\.?I|B\.?B|B&B|ALL INCLUSIVE)\)",n.upper())
    if not m: return None
    t=m.group(1).replace(".","")
    return {"HB":"Half board","FB":"Full board","AI":"All inclusive","BB":"Bed & breakfast","B&B":"Bed & breakfast","ALL INCLUSIVE":"All inclusive"}.get(t)
def star_of(*vals):
    for v in vals:
        m=re.match(r"^\s*(\d)\s*\*\s*$",str(v or ""))
        if m: return int(m.group(1))
    return None

hotels=[]
for ws in wb.worksheets:
    country,region=REGIONS[ws.title]
    cur=None; hdr=None; mode=None; shift=False
    maxc=ws.max_column
    for r in range(1,ws.max_row+1):
        row=[ws.cell(r,c).value for c in range(1,maxc+1)]
        A=str(row[0]).strip() if row[0] is not None else ""
        B=row[1] if len(row)>1 else None
        c_mode=cur_of(A) if A and not room_key(A) else None
        if c_mode and len(A)<10:
            mode=c_mode
            new_hdr={i:row[i] for i in range(1,maxc) if row[i] not in (None,"")}
            # A currency row without period labels (e.g. "$ USD.") reuses the
            # hotel's existing period header.
            if any(months_in(v)[0] or months_in(v)[1] for v in new_hdr.values()):
                hdr=new_hdr
            shift=False
            # Some NAIROBI blocks carry the P.P SHARING figure on the currency
            # row itself, pushing every label one row down (SHARING row holds
            # the SINGLE rate, SINGLE row holds the TRIPLE rate).
            first=num(row[1]) if len(row)>1 else None
            if cur is not None and (not hdr or {str(v).upper() for v in hdr.values()}=={"JANUARY TO DECEMBER"}) and first is not None:
                ok = first>=500 if mode=="KES" else first<=3000
                if ok:
                    cur["rates"].setdefault(mode,{})["sharing"]={"monthly":[first]*12,"festive":None}
                    shift=True
            continue
        rk=room_key(A)
        if rk and shift:
            rk={"sharing":"single","single":"triple"}.get(rk)
        if rk:
            if cur is None or mode is None: continue
            vals={i:num(row[i]) for i in range(1,maxc) if num(row[i]) is not None}
            # Implausible values for the currency are source typos (e.g. a USD
            # figure typed under KSHS., or a KSHS. figure under USD).
            if mode=="KES": vals={i:v for i,v in vals.items() if v>=500}
            if mode=="USD": vals={i:v for i,v in vals.items() if v<=3000}
            if not vals: continue
            bucket=cur["rates"].setdefault(mode,{}).setdefault(rk,{"monthly":[None]*12,"festive":None})
            if hdr:
                for i,v in vals.items():
                    lab=hdr.get(i)
                    if lab is None: continue
                    ms,fest=months_in(lab)
                    if fest: bucket["festive"]=max(bucket["festive"] or 0,v); continue
                    for m in ms:
                        prev=bucket["monthly"][m-1]
                        bucket["monthly"][m-1]=v if prev is None else max(prev,v)
            else:
                # single year-round value (first numeric in B..)
                v=vals.get(1, next(iter(vals.values())))
                bucket["monthly"]=[v]*12
            continue
        # hotel name row: text in B, not a contact, A empty or section marker
        if isinstance(B,str) and B.strip() and not A.upper().startswith("CONTACT"):
            txt=B.strip()
            if re.search(r"@|www\.|http",txt) or re.fullmatch(r"[\d\s/+()*-]+",txt): 
                if cur and not cur.get("contact"): cur["contact"]=txt
                continue
            if re.search(r"JANUARY TO DECEMBER",txt.upper()):
                hdr={1:"JANUARY TO DECEMBER"}; continue
            if A and not re.fullmatch(r"[A-Z]\.?",A): continue
            cur={"name":clean_name(txt),"rawName":txt,"country":country,"region":region,"sheet":ws.title,"row":r,
                 "stars":star_of(*row[2:8]),"mealPlan":meal_plan(txt),"rates":{}}
            mode=None; hdr=None; shift=False
            hotels.append(cur)
        elif A.upper().startswith("CONTACT") and cur and isinstance(B,str):
            cur["contact"]=B.strip()

# post-process: drop empty buckets, fill single-month gaps with nearest known
# Drop copy-pasted template rate blocks: identical (currency, sharing values,
# festive) signatures covering <=3 months that repeat across many hotels.
from collections import Counter as _C
def _sig(curr,rates):
    b=rates.get("sharing")
    if not b: return None
    filled=[v for v in b["monthly"] if v is not None]
    if len(filled)>3: return None
    return (curr,tuple(sorted(set(filled))),b["festive"])
_sigs=_C(_sig(c,r) for h in hotels for c,r in h["rates"].items())
PLACEHOLDERS={k for k,n in _sigs.items() if k and n>=5}
for h in hotels:
    for c in list(h["rates"]):
        if _sig(c,h["rates"][c]) in PLACEHOLDERS: del h["rates"][c]
print("placeholder signatures:",PLACEHOLDERS)

for h in hotels:
    for curr in list(h["rates"]):
        for rk in list(h["rates"][curr]):
            b=h["rates"][curr][rk]; m=b["monthly"]
            if all(v is None for v in m) and b["festive"] is None:
                del h["rates"][curr][rk]; continue
            b["filledMonths"]=sum(v is not None for v in m)
            known=[v for v in m if v is not None]
            if known:
                for i in range(12):
                    if m[i] is None:
                        # nearest known month (circular)
                        for d in range(1,12):
                            for j in ((i-d)%12,(i+d)%12):
                                if m[j] is not None and m[i] is None: m[i]=m[j]
            b["monthly"]=[round(v,2) if v is not None else None for v in m]
        if not h["rates"][curr]: del h["rates"][curr]
    usd=h["rates"].get("USD",{}).get("sharing"); kes=h["rates"].get("KES",{}).get("sharing")
    base = min(v for v in usd["monthly"] if v) if usd and any(usd["monthly"]) else (round(min(v for v in kes["monthly"] if v)/130,2) if kes and any(kes["monthly"]) else 0)
    h["fromUsd"]=base

NOT_LODGING=re.compile(r"BAL+O+N|^(?!.*(LODGE|HOTEL|CAMP)).*RESTAURANT$|CHURRASCARIA|MUSEUM|GIRAFFE CENT|BOMAS OF KENYA")
excluded=[h["name"] for h in hotels if NOT_LODGING.search(h["name"])]
hotels=[h for h in hotels if not NOT_LODGING.search(h["name"])]
print("excluded (not accommodation):",excluded)

# ---- seed records ----
SMALL={"and","of","the","&","at","by","on","in"}
def titlecase(s):
    s=re.sub(r"\s*\((H\.?B|F\.?B|A\.?I|B\.?B|B&B|ALL INCLUSIVE)\)\s*","",s,flags=re.I).strip(" -")
    out=[]
    for i,w in enumerate(s.split(" ")):
        lw=w.lower()
        if re.fullmatch(r"([A-Za-z]\.){1,}[A-Za-z]?\.?",w) or re.fullmatch(r"[A-Z]{1,2}\d*|D2|II|III|IV|KWS|YMCA|YWCA|ACK|PCEA|KCB|CBD|NSSF|JKIA|MT\.",w):
            out.append(w.upper()); continue
        if i and lw in SMALL: out.append(lw); continue
        t="-".join(p[:1].upper()+p[1:] for p in lw.split("-"))
        t=re.sub(r"'S\b","'s",t); t=re.sub(r"^(Mc|O')([a-z])",lambda m:m.group(1)+m.group(2).upper(),t)
        out.append(t)
    return " ".join(out)
def slug(s): return re.sub(r"[^a-z0-9]+","-",s.lower()).strip("-")
IMG={"kenya":"assets/destinations/kenya-elephants.jpg","tanzania":"assets/destinations/serengeti.jpg","uganda":"assets/destinations/uganda-gorilla.jpg"}
COAST={"South Coast (Diani)","North Coast","Malindi & Watamu","Lamu"}
def image(h):
    if h["region"] in COAST: return "assets/destinations/diani-beach.jpg"
    if h["region"] in {"Zanzibar","Pemba Island","Mafia Island","Songo Songo Island","Dar es Salaam","Kilwa Masoko"}: return "assets/destinations/stone-town.jpg"
    if h["region"]=="Ngorongoro": return "assets/destinations/ngorongoro.jpg"
    return IMG[h["country"]]
seen=set(); out=[]
for h in hotels:
    name=titlecase(h["name"])
    s=slug(f'{name}-{h["region"]}')
    if s in seen: continue   # exact duplicate listing in same region
    seen.add(s)
    rates={c:{rk:{"monthly":b["monthly"],"festive":b["festive"]} for rk,b in r.items()} for c,r in h["rates"].items()} or None
    kind="property"
    for k in ("camp","lodge","resort","hotel","villa","house","cottage","club","suites","apartment"):
        if k in name.lower(): kind={"villa":"villa","house":"guest house","suites":"suites","apartment":"apartments"}.get(k,k); break
    desc=(f"{h['stars']}-star " if h["stars"] else "")+f"{kind} in {h['region']}"+(f", {h['mealPlan'].lower()}" if h["mealPlan"] else "")+"."
    desc=desc[0].upper()+desc[1:]
    out.append({"slug":s,"name":name,"country":h["country"],"region":h["region"],"destination":h["region"],
        "pricePerNight":h["fromUsd"] or 0,"rating":h["stars"] or 0,"image":image(h),
        "tags":[t for t in [h["mealPlan"]] if t],"description":desc,"topRated":False,"isAvailable":True,"rates":rates})
json.dump(out,open(HERE/'hotels.seed.json','w'),indent=1,ensure_ascii=False)
from collections import Counter
print(len(out),Counter(x["country"] for x in out),"priced",sum(1 for x in out if x["rates"]))
