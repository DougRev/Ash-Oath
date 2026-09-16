from pathlib import Path
import csv, re, json
from collections import Counter
from html import escape
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import letter
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'output' / 'pdf'
OUT.mkdir(parents=True, exist_ok=True)
INBOX = ROOT / 'asset-inbox'
ROWS = []
def slug(s):
    return re.sub(r'[^a-z0-9]+', '-', s.lower().replace('’', '').replace("'", '')).strip('-')
def add(name, folder, file=None, kind='item', scope='Current content', priority='P1', existing='', brief=''):
    file = file or slug(name)
    sizes = {'item':'1024x1024', 'portrait':'1024x1024', 'scene':'1920x1080', 'cutout':'1536x1536', 'banner':'1024x1536'}
    path = f'asset-inbox/{folder}/{file}.png'
    ROWS.append(dict(asset_id=folder.replace('/','-')+'-'+file, name=name, priority=priority, scope=scope,
        source_path=path, size_px=sizes[kind], background='Transparent' if kind in ('item','cutout','banner') else 'Full image',
        existing_art=existing, status='Existing art to review' if existing else 'Not started', brief=brief,
        creator_or_source='', usage_rights='', notes=''))
    (ROOT / path).parent.mkdir(parents=True, exist_ok=True)

army=['Militia blades','Sentinel spears','Ranger longbows','Royal halberds','Padded armor']
for n in army: add(n,'army',brief='Single soldier kit; weathered practical equipment; same angle and lighting across this group.')
weapons=['Traveler’s Blade','Iron Longsword','Warden’s Edge','Moonsteel Saber','Oathkeeper','Dawnbringer']
armor=['Weathered Leathers','Scout’s Jerkin','Briarhide Coat','Sentinel’s Plate','Mantle of the Fallen','Aegis of the First King']
for group, names in [('weapons',weapons),('armor',armor)]:
    for n in names: add(n,'character/current/'+group,brief='Recognizable inventory silhouette; no rarity frame or text.')
for chest in ['Wayfarer','Warlord','Sovereign']:
    for state in ['closed','open']:
        add(chest+' chest '+state, 'chests', scope='Current content', brief=f'{state.title()} chest, identical camera and construction to its paired state; '+{'Wayfarer':'worn wood and iron.','Warlord':'reinforced military steel.','Sovereign':'ornate ancient royal metalwork.'}[chest])
runes=['Resolve','Vigor','Ascendance','the Ancients','Eternity']
for n in runes: add('Rune of '+n,'runes',priority='P2',brief='Distinct engraved stone silhouette; discoverable item only, no public collection preview.')
pets=['Woodland Fox','Mossback Owl','Silverfang Wolf','Ember Drake','Dawn Phoenix']
for i,n in enumerate(pets):
    add(n,'companions',slug(n)+'-portrait',kind='portrait',priority='P2',existing=f'public/art/companion-{i}.webp',brief='Portrait with face centered; existing image may be kept.')
    add(n+' full body','companions',slug(n)+'-full',kind='cutout',scope='Proposed presentation',priority='Optional',brief='Same individual and markings as portrait; complete tail and wings inside frame.')
tiers=['Homestead','Settlement','Village','Castle','Stronghold','Citadel']
for n in tiers:
    existing={'Homestead':'homestead','Village':'village','Stronghold':'stronghold'}.get(n)
    add(n,'settlements',kind='scene',priority='P2',existing=f'public/art/{existing}.webp' if existing else '',brief='Same valley, camera and time of day across all six tiers; recognizable home grows into a fortified realm.')
for n in ['Armory','Barracks','Blacksmith','Trading Post','Watchtower','Bank']:
    add(n,'buildings',kind='scene',priority='P2',brief='Readable building silhouette; important features within the central crop; no signage text.')
for n in ['Iron Covenant','Verdant Pact','Ashen Order','Tidebound']:
    for part in ['emblem','banner','commander']:
        add(n+' '+part,'factions/'+slug(n),part,kind={'emblem':'item','banner':'banner','commander':'portrait'}[part],priority='P2',scope='Current faction with proposed artwork',brief='Consistent symbols and materials within this faction; no letters or player rank baked in.')
for n in ['Unarmed recruit','Offensive soldier','Defensive soldier']:
    add(n,'army',kind='portrait',priority='P2',scope='Proposed presentation',brief='Generic recruit or soldier; visually distinguish role without implying a new unit class.')

dungeons=[
 ('Whispering Woods','Borderlands','Thornbound Guardian',['Forgotten Path','Briar Hollow','Sunken Shrine','Watchers Crossing'],'dungeon','thornbound-boss'),
 ('Hollowcrypt','Fallen Kingdoms','Oathless King',['Silent Stair','Hall of Echoes','Bone Archive','Kingless Court'],'crypt','oathless-boss'),
 ('Ember Citadel','Ashen Frontier','Last Flame',['Cinder Gate','Furnace of Names','Ashfall Bridge','Crimson Spire'],'ember','flame-boss'),
 ('Bandit Redoubt','Borderlands','',[],None,None),('Briarfen Marsh','Borderlands','',[],None,None),('Watchers Quarry','Borderlands','',[],None,None),
 ('Ruins of Alderkeep','Fallen Kingdoms','',[],None,None),('Mourning Cathedral','Fallen Kingdoms','',[],None,None),('Siege of the Empty Throne','Fallen Kingdoms','',[],None,None),
 ('Cinderworks','Ashen Frontier','',[],None,None),('Obsidian Crucible','Ashen Frontier','',[],None,None),('Caldera of the First Fire','Ashen Frontier','',[],None,None),
 ('Saltwind Wrecks','Drowned Coast','',[],None,None),('Drowned Basilica','Drowned Coast','',[],None,None),('Tempest Bastion','Drowned Coast','',[],None,None),('Abyssal Court','Drowned Coast','',[],None,None),
 ('Glasswood Rift','Shattered Expanse','',[],None,None),('Astral Archive','Shattered Expanse','',[],None,None),('Broken Observatory','Shattered Expanse','',[],None,None),('Oathbreakers End','Shattered Expanse','',[],None,None)]
for name,region,boss,stages,scene,bossart in dungeons:
    folder='dungeons/'+slug(name)
    scope='Current content' if scene else 'Proposed dungeon'
    priority='P2' if scene else 'P3'
    add(name+' entrance',folder,'entrance',kind='scene',scope=scope,priority=priority,existing=f'public/art/{scene}.webp' if scene else '',brief=f'{region} environment; leave space for title overlays; future names and themes require approval.')
    for i in range(4): add(name+' stage '+str(i+1)+((' '+stages[i]) if stages else ''),folder,f'stage-{i+1:02}',kind='scene',scope=scope,priority=priority,brief='Different location within the same dungeon; do not reuse the entrance composition.')
    add(name+' boss arena',folder,'boss-arena',kind='scene',scope=scope,priority=priority,brief='Environment without boss; clear center for future combat overlays.')
    add(boss or name+' boss',folder,'boss',kind='portrait',scope=scope,priority=priority,existing=f'public/art/{bossart}.webp' if bossart else '',brief='Boss identity must be approved for proposed dungeons. Existing wide boss art may be retained until a portrait is needed.')
    for style in ['charging','channeling','fortified']:
        add(name+' '+style+' enemy',folder,'enemy-'+style,kind='portrait',scope='Proposed enemy identity',priority='P3',brief='Enemy design pending; visual silhouette should communicate '+style+' behavior.')

families={'weapons':['sword','axe','mace','dagger','bow','staff'],'offhand':['shield','parrying-blade','focus']}
for tier in range(1,6):
    for category, names in families.items():
        for n in names: add(f'Tier {tier} {n}',f'character/future/t{tier:02}/{category}',n,scope='Proposed equipment system',priority='P3',brief='Base design pending; no rarity effects. Higher tier changes materials and craftsmanship.')
    for weight in ['light','medium','heavy']:
        for slot in ['helm','chest','gloves','greaves','boots']:
            add(f'Tier {tier} {weight} {slot}',f'character/future/t{tier:02}/armor',weight+'-'+slot,scope='Proposed equipment system',priority='P3',brief='Cohesive armor family; isolated equipment with consistent orientation.')
    for n in ['ring','amulet','charm']: add(f'Tier {tier} {n}',f'character/future/t{tier:02}/accessories',n,scope='Proposed equipment system',priority='P3',brief='Concept for one accessory slot; exact item names and bonuses not finalized.')
sets=[('Thornwarden','Bark textures, green cloth and thorn details; survival.'),('Gravekeeper','Ancient iron, faded funerary cloth and bone motifs; endurance.'),('Emberwatch','Blackened steel and restrained ember accents; offense.'),('Pathfinder','Supple leather, practical buckles and forest cloth; evasion.'),('Oathmarshal','Disciplined plate, gold trim and heraldic details; leadership.')]
for name,brief in sets:
    for slot in ['helm','chest','gloves','greaves','boots']:
        add(name+' '+slot,'character/sets/'+slug(name),slot,scope='Proposed armor set',priority='P3',brief=brief+' Set effects and stats are not baked into art.')
for i in range(1,13): add(f'Commander avatar {i:02}','avatars',f'commander-{i:02}',kind='portrait',priority='Optional',scope='Proposed presentation',brief='Varied adult fantasy commanders with diverse appearances; centered face; neutral background.')
for n in ['Victory battlefield','Defended stronghold','Plundered treasury','Season champions']:
    add(n,'events',kind='scene',priority='Optional',scope='Proposed presentation',brief='Reusable outcome illustration, no named player, numbers, words or fixed faction winner.')

with (OUT/'ash-and-oath-asset-checklist.csv').open('w',newline='',encoding='utf-8-sig') as f:
    w=csv.DictWriter(f,fieldnames=list(ROWS[0]));w.writeheader();w.writerows(ROWS)
assert len({r['source_path'] for r in ROWS}) == len(ROWS)
(INBOX/'README.md').write_text('''# Ash and Oath image inbox

Place original PNG images in the exact folders and filenames listed in ../output/pdf/ash-and-oath-asset-checklist.csv.
Read ../output/pdf/ash-and-oath-asset-guide.pdf for sizes, style and production priorities.

This is a source-art inbox, not a live asset folder. Files here do not appear in the app automatically.
Existing production art remains in public/art. Integration will optimize images, create WebP exports,
map them to stable game IDs, add accessible descriptions and verify desktop/mobile rendering.
Future equipment, armor sets and additional dungeons still need gameplay implementation.

Use PNG for originals. If your source is JPEG or WebP, preserve its true extension and update the CSV;
do not rename an extension to pretend it is PNG. Keep the listed basename. Put alternate versions
in a variants subfolder, leaving one chosen image at the expected path. Do not upload images of
undiscovered runes or other spoilers to the public folder until their visibility is handled.
''',encoding='utf-8')

fontdir=Path('C:/Windows/Fonts')
pdfmetrics.registerFont(TTFont('Guide',str(fontdir/'arial.ttf')))
pdfmetrics.registerFont(TTFont('GuideBold',str(fontdir/'arialbd.ttf')))
styles=getSampleStyleSheet()
for name in ['Normal','BodyText','Heading1','Heading2','Title']:
    styles[name].fontName='GuideBold' if name in ('Heading1','Heading2','Title') else 'Guide'
    styles[name].textColor=colors.black
styles['Normal'].fontSize=10.5;styles['Normal'].leading=15
styles['BodyText'].fontSize=10.5;styles['BodyText'].leading=15;styles['BodyText'].spaceAfter=8
styles['Title'].fontSize=27;styles['Title'].leading=32;styles['Title'].spaceAfter=14
styles['Heading1'].fontSize=21;styles['Heading1'].leading=26;styles['Heading1'].spaceAfter=12
styles['Heading2'].fontSize=13;styles['Heading2'].leading=18;styles['Heading2'].spaceBefore=12;styles['Heading2'].spaceAfter=7
styles.add(ParagraphStyle(name='Cell',fontName='Guide',fontSize=9,leading=12))
styles.add(ParagraphStyle(name='HeadCell',fontName='GuideBold',fontSize=9,leading=12,textColor=colors.white))
story=[]
def p(t,style='BodyText'): story.append(Paragraph(t,styles[style]))
def h(t): p(t,'Heading2')
def page(t):
    if story:story.append(PageBreak())
    p(t,'Heading1')
def table(headers, rows, widths):
    data=[[Paragraph(escape(str(c)),styles['HeadCell']) for c in headers]]+[[Paragraph(escape(str(c)),styles['Cell']) for c in row] for row in rows]
    t=Table(data,colWidths=widths,repeatRows=1,hAlign='LEFT')
    t.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,0),colors.HexColor('#263b36')),('ROWBACKGROUNDS',(0,1),(-1,-1),[colors.white,colors.HexColor('#f3f5f4')]),('GRID',(0,0),(-1,-1),.4,colors.HexColor('#d9d9d9')),('VALIGN',(0,0),(-1,-1),'MIDDLE'),('LEFTPADDING',(0,0),(-1,-1),7),('RIGHTPADDING',(0,0),(-1,-1),7),('TOPPADDING',(0,0),(-1,-1),6),('BOTTOMPADDING',(0,0),(-1,-1),6)]))
    story.append(t);story.append(Spacer(1,9))
def footer(c,doc):
    c.setFont('Guide',8);c.setFillColor(colors.HexColor('#5b6662'))
    c.drawString(48,30,'ASH & OATH  |  ASSET PRODUCTION GUIDE  |  15 SEPTEMBER 2026')
    c.drawRightString(564,30,str(doc.page))

p('Ash and Oath Asset Guide','Title')
p('Image checklist and delivery instructions','Heading2')
p('Prepared for Doug Revell. Collect or create images using the filenames in the companion CSV, then place them in the project image inbox. This guide covers current game content and a proposed expansion library. It does not add new gameplay or automatically display uploaded files.')
h('Your delivery folder')
p('<b>LoLaL-2.0 / asset-inbox /</b><br/>Full location: C:/Users/dougr/OneDrive/Documents/ChatGPT/LoLaL-2.0/asset-inbox')
p('The folder structure is created for you. Keep source art here. The existing <b>public/art</b> folder remains the optimized production library; do not replace it wholesale.')
h('What to make first')
counts=Counter(r['priority'] for r in ROWS)
table(['Batch','Scope','Checklist rows'],[['P1','5 army kits, 12 current character items, 6 chest states',counts['P1']],['P2','Current world art, companions, runes and faction identity',counts['P2']],['P3','Proposed dungeons, enemy identities, expanded gear and armor sets',counts['P3']],['Optional','Companion full bodies, avatar library and outcome scenes',counts['Optional']]],[58,374,84])
p(f'The CSV contains <b>{len(ROWS)} individually named asset slots</b>, including existing art to review. This is a planning library, not an instruction to produce everything now. Start with the 23 P1 images, then work in small themed batches.')
h('How to track progress')
p('Use <b>ash-and-oath-asset-checklist.csv</b> in Excel or another spreadsheet editor. Every row includes the exact source path, dimensions, background requirement, scope, art brief and existing file when available. Set status to Not started, In progress, Ready for review, Approved or Integrated. Record creator/source and usage rights.')
p('Future dungeon names, enemy designs, armor sets and equipment families are proposals. Finalize their designs before spending time or money on the P3 batch.')

page('Image standards')
table(['Asset type','Source size','Composition'],[['Equipment and runes','1024 × 1024 PNG','Transparent background; centered object; 10–15% clear margin.'],['Companion and enemy portraits','1024 × 1024 PNG','Full background; face and defining features within central 70%.'],['World and dungeon scenes','1920 × 1080 PNG','Full background; important subjects inside central 60% for mobile crops.'],['Full body creatures','1536 × 1536 PNG','Transparent background; include all wings, feet, weapons and tails.'],['Faction banners','1024 × 1536 PNG','Transparent background; vertical banner, no text.']],[135,123,258])
h('One visual language')
p('Use painterly medieval fantasy with weathered iron, leather, timber and stone. Favor dark forest greens, muted earth tones and warm gold light. Magic should be restrained and readable. Keep camera angle, lighting direction and object scale consistent within each equipment family.')
p('Do not bake in names, stats, rarity borders, buttons, watermarks or the game logo. The interface supplies those elements. Do not create a separate image for each random stat roll. A legendary named item can have unique art; ordinary rarity changes can use interface treatments.')
h('File rules')
p('Use lowercase filenames with hyphens. The CSV specifies PNG originals. If you already have a JPEG or WebP, keep its real extension and note the change in the CSV; renaming the extension does not convert the image. Keep editable masters outside the chosen-file path.')
p('Use a <b>variants/</b> subfolder for alternatives. Leave one approved image at the expected filename. Production integration will export optimized WebP files, typically 512 px item thumbnails and up to 1920 px scenes, while preserving these originals.')
h('Reusable prompt structure')
p('“[Asset subject], Ash and Oath medieval fantasy game art, [materials and distinctive motif], painterly realism, [consistent camera], warm directional light, readable silhouette, [transparent or full background], centered composition with safe margins, no text, no interface, no watermark.”')
p('Check the small-size thumbnail before accepting any equipment image. A beautiful large illustration is not useful if the item becomes an indistinct shape in inventory.')

page('Army and current character items')
p('These 17 images correspond to equipment already present in the game. Their CSV paths are ready to use. Current character armor is one slot; the expanded slot system described later is not implemented yet.')
table(['Folder under asset inbox','Item filenames ending in png'],[['army/','militia-blades, sentinel-spears, ranger-longbows, royal-halberds, padded-armor'],['character/current/weapons/','travelers-blade, iron-longsword, wardens-edge, moonsteel-saber, oathkeeper, dawnbringer'],['character/current/armor/','weathered-leathers, scouts-jerkin, briarhide-coat, sentinels-plate, mantle-of-the-fallen, aegis-of-the-first-king']],[180,336])
h('Equipment direction')
table(['Family','Visual distinction'],[['Army kits','Practical, uniform and mass produced. Spears, bows and halberds must have distinct silhouettes.'],['Starting character gear','Traveler’s Blade and Weathered Leathers look used and repairable.'],['Higher character gear','Improve materials and craftsmanship gradually. Reserve elaborate detailing for named high-rarity items.'],['Armor','Show the actual wearable armor, not an entire character obscuring it. Keep a consistent front or three-quarter angle.']],[140,376])
h('Optional role portraits in the second batch')
p('<b>army/unarmed-recruit.png</b><br/><b>army/offensive-soldier.png</b><br/><b>army/defensive-soldier.png</b>')
p('These are presentation assets for existing roles, not new unit classes. Offense and defense should remain understandable through labels even without the image.')

page('Chests companions and discoveries')
table(['Folder','Images to provide'],[['chests/','wayfarer-chest-closed.png and wayfarer-chest-open.png; repeat for warlord and sovereign.'],['runes/','rune-of-resolve.png, rune-of-vigor.png, rune-of-ascendance.png, rune-of-the-ancients.png, rune-of-eternity.png'],['companions/','woodland-fox-portrait.png, mossback-owl-portrait.png, silverfang-wolf-portrait.png, ember-drake-portrait.png, dawn-phoenix-portrait.png']],[115,401])
h('Chest pairs')
p('Create each open and closed pair from the same camera, object position and design. Wayfarer uses worn wood and iron; Warlord uses reinforced military fittings; Sovereign uses ancient royal craftsmanship. Keep the reward itself out of the open image so it can be revealed separately.')
h('Companions already have artwork')
table(['Companion','Existing production image'],[[n,f'public/art/companion-{i}.webp'] for i,n in enumerate(pets)],[220,296])
p('Existing portraits may be kept. Optional full-body files use the same slug with <b>-full.png</b>. Match the portrait’s markings, proportions and colors. Injury, experience, ability and rarity indicators are interface overlays, not separate paintings.')
h('Keep discoveries private')
p('Rune images belong in the private working inbox until integrated with discovery rules. Their artwork should only appear in the player interface after the relevant discovery. This document is a production checklist, not a public loot guide.')

page('Settlements buildings and factions')
p('Create six settlement scenes from the same landscape and viewpoint. Players should recognize their original home inside each larger settlement.')
table(['Folder','Required filenames ending in png'],[['settlements/','homestead, settlement, village, castle, stronghold, citadel'],['buildings/','armory, barracks, blacksmith, trading-post, watchtower, bank'],['factions/iron-covenant/','emblem, banner, commander'],['factions/verdant-pact/','emblem, banner, commander'],['factions/ashen-order/','emblem, banner, commander'],['factions/tidebound/','emblem, banner, commander']],[205,311])
h('Existing settlement artwork')
p('<b>public/art/homestead.webp</b>, <b>village.webp</b> and <b>stronghold.webp</b> already exist. The current app reuses these across multiple tiers. Keep them if they fit the six-scene progression; the CSV marks them for review rather than mandatory replacement.')
h('Faction direction')
table(['Faction','Suggested identity'],[['Iron Covenant','Disciplined ironwork, warm gold, sturdy heraldry.'],['Verdant Pact','Living roots, leaves, green cloth, practical woodland materials.'],['Ashen Order','Charcoal, muted red, ancient sigils, restrained ember light.'],['Tidebound','Sea blue, silver, waves, ropes and maritime craftsmanship.']],[150,366])
p('Faction symbols should work at small sizes. Clean vector emblems can be supplied as SVG in addition to the PNG source. Avoid intricate marks that disappear in a small badge.')
p('Do not generate an image for every barracks or bank level. A few major upgrade appearances can be added later after the base artwork is established.')

page('Current dungeon art checklist')
p('Each dungeon uses a stable folder under <b>asset-inbox/dungeons/</b>. Existing entrance and boss illustrations may be reused. Stage backgrounds and separate arenas are additions; their presence in the inbox does not create a new game encounter.')
table(['Dungeon folder','Stage 01 through stage 04','Boss'],[['whispering-woods/','Forgotten Path; Briar Hollow; Sunken Shrine; Watcher’s Crossing','Thornbound Guardian'],['hollowcrypt/','Silent Stair; Hall of Echoes; Bone Archive; Kingless Court','Oathless King'],['ember-citadel/','Cinder Gate; Furnace of Names; Ashfall Bridge; Crimson Spire','Last Flame']],[135,245,136])
h('The standard dungeon pack')
table(['Filename','Purpose'],[['entrance.png','Dungeon selection and arrival scene.'],['stage-01.png to stage-04.png','Four distinct non-boss stage environments.'],['boss-arena.png','Boss location without the boss, leaving space for overlays.'],['boss.png','Boss portrait; keep existing wide artwork until a portrait is needed.'],['enemy-charging.png','Proposed regular enemy with an aggressive moving silhouette.'],['enemy-channeling.png','Proposed caster or ritual enemy.'],['enemy-fortified.png','Proposed armored or entrenched enemy.']],[180,336])
p('One standard pack contains <b>10 images</b>. The three enemy identities still need design work, including in existing dungeons. Their filenames describe tactical roles, not finalized creature names.')
h('Existing files to review')
p('Whispering Woods: <b>dungeon.webp</b> and <b>thornbound-boss.webp</b>.<br/>Hollowcrypt: <b>crypt.webp</b> and <b>oathless-boss.webp</b>.<br/>Ember Citadel: <b>ember.webp</b> and <b>flame-boss.webp</b>.<br/>All six live under <b>public/art/</b>.')

page('Proposed twenty dungeon roadmap')
p('Three dungeons already exist; the other 17 names below are working proposals. Regional grouping is also proposed: it does not replace current in-game region labels. Approve a region’s lore, bosses and enemies before commissioning its images.')
table(['Region','Dungeon names','Content status'],[['Borderlands','Whispering Woods; Bandit Redoubt; Briarfen Marsh; Watchers Quarry','First exists; three proposed'],['Fallen Kingdoms','Hollowcrypt; Ruins of Alderkeep; Mourning Cathedral; Siege of the Empty Throne','First exists; three proposed'],['Ashen Frontier','Ember Citadel; Cinderworks; Obsidian Crucible; Caldera of the First Fire','First exists; three proposed'],['Drowned Coast','Saltwind Wrecks; Drowned Basilica; Tempest Bastion; Abyssal Court','All proposed'],['Shattered Expanse','Glasswood Rift; Astral Archive; Broken Observatory; Oathbreakers End','All proposed']],[120,288,108])
h('Scope and folder naming')
p('The CSV expands all 20 dungeon packs into <b>200 individual filenames</b>, including the three current dungeons. Folder names are lowercase hyphenated dungeon names, for example <b>dungeons/drowned-basilica/boss-arena.png</b>. Each future stage and boss is deliberately unnamed until its encounter is designed.')
h('Produce one complete region at a time')
p('First agree on the visual theme, one boss identity and three enemy identities per dungeon. Then produce the entrance and boss key art. Use those as references for stage locations, the arena and regular enemies. This avoids a collection of attractive images that do not belong to the same place.')
p('Difficulty variants should generally reuse environments with interface effects or carefully chosen alternate lighting. Do not make a second full art pack simply because enemy stats are higher.')

page('Expanded character equipment library')
p('Proposed slots: <b>main hand, off hand, helm, chest, gloves, greaves, boots and accessory</b>. Two-handed weapons occupy both hands. These slot rules and new item families still require implementation; current character equipment remains weapon and armor plus runes and companion.')
table(['Group per tier','Base filenames','Count over five tiers'],[['Weapons','sword, axe, mace, dagger, bow, staff','30'],['Off hand','shield, parrying-blade, focus','15'],['Armor','light, medium and heavy versions of helm, chest, gloves, greaves and boots','75'],['Accessories','ring, amulet, charm','15']],[130,300,86])
p('This creates <b>135 proposed base designs</b>. The CSV lists each separately. Tiers are t01 through t05; these are equipment progression tiers, not rarity or settlement levels.')
h('Exact path examples')
p('<b>character/future/t01/weapons/sword.png</b><br/><b>character/future/t03/offhand/shield.png</b><br/><b>character/future/t05/armor/heavy-helm.png</b><br/><b>character/future/t02/accessories/amulet.png</b><br/>All paths are beneath <b>asset-inbox/</b>.')
h('Keep the library manageable')
p('A base item shares its image across ordinary stat rolls. Rarity borders, affix names and set indicators come from the interface. Create additional artwork only when an item has a distinctive visual identity, such as a named unique or a recognizable set piece.')
p('Start with one representative equipment tier to agree on framing and materials before producing all five. Light armor should emphasize cloth and leather, medium armor reinforced layers, and heavy armor substantial metal protection.')

page('Proposed armor sets and extra artwork')
p('Five proposed sets each need five pieces: helm, chest, gloves, greaves and boots. That is <b>25 distinct set images</b>, separate from the generic armor library. Two, three and five-piece bonuses are a design proposal; their effects and values are not finalized.')
table(['Set folder','Visual brief'],[[slug(n)+'/',b] for n,b in sets],[160,356])
p('Each folder sits under <b>asset-inbox/character/sets/</b> and contains <b>helm.png, chest.png, gloves.png, greaves.png, boots.png</b>. Design the whole set together before isolating its pieces. Repeat materials and motifs so matching pieces are recognizable without relying only on their border color.')
h('Optional character and outcome artwork')
table(['Folder','Scope'],[['avatars/','commander-01.png through commander-12.png. A varied portrait library for future player and simulated-opponent presentation.'],['events/','victory-battlefield.png, defended-stronghold.png, plundered-treasury.png, season-champions.png. Reusable scenes without fixed player names or winners.']],[120,396])
h('Assets that should remain interface elements')
p('Keep AP, gold, shields, ability symbols, rank indicators, formation diagrams, rarity frames and progress bars as consistent vector/UI elements. Ferocity, Guardian and Scavenger need readable symbols, but not large generated illustrations. Chest glows and damage flashes can be effects layered over the artwork.')
p('Companion evolutions, alternate skins, world maps, crafting material families and seasonal cosmetic rewards can become later batches. Their catalog is not yet specified, so no invented production filenames are required for them now.')

page('Delivery and integration checklist')
for heading,body in [
 ('1 Choose a small batch','Start with P1 in the CSV. For a proposed batch, finalize item identities or dungeon encounters first.'),
 ('2 Save each original','Use the source_path from the CSV relative to the project root. Preserve the true file extension. Do not put large originals into public/art.'),
 ('3 Check the image','Verify dimensions, background transparency, safe margins, complete silhouettes and consistency with neighboring assets. Preview items at small size and scenes in a narrow mobile crop.'),
 ('4 Update the checklist','Record creator/source, permission or license details, status and any filename change. Mark a chosen image Ready for review; keep alternates under variants/.'),
 ('5 Hand off the batch','Tell me which batch is ready and where you saved it. You do not need to wait until all planned images exist.'),
 ('6 Integrate and verify','We will optimize exports, map images to stable content IDs, add accessible descriptions and fallbacks, check desktop/mobile layouts, and publish through the normal deployment process.')]:
    h(heading);p(body)
h('Important limits')
p('Adding images alone does not implement additional equipment slots, armor set bonuses, new dungeons or enemy mechanics. Existing content can receive artwork sooner; future content needs its gameplay implementation. File presence in asset-inbox does not automatically change the live app.')
p('Retain your original image masters. Integration should produce separate optimized files so later resizing and cropping do not degrade the only copy. Only assets you have permission to use should be included in the production game.')
p(f'<b>Reference inventory:</b> {len(ROWS)} rows in the accompanying CSV. Content checked against src/game/data.ts, src/game/engine.ts, src/game/companions.ts and public/art on 15 September 2026. Proposed rows are planning recommendations, not implemented features.')

doc=SimpleDocTemplate(str(OUT/'ash-and-oath-asset-guide.pdf'),pagesize=letter,rightMargin=48,leftMargin=48,topMargin=45,bottomMargin=48,title='Ash and Oath Asset Guide',author='Ash and Oath development')
doc.build(story,onFirstPage=footer,onLaterPages=footer)
print(json.dumps({'rows':len(ROWS),'priorities':dict(counts),'pdf':str(OUT/'ash-and-oath-asset-guide.pdf')}))
