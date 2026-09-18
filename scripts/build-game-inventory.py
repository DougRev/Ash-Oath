from pathlib import Path
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from html import escape

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'output' / 'pdf'
OUT.mkdir(parents=True, exist_ok=True)
PDF = OUT / 'ash-and-oath-current-game-breakdown.pdf'

fontdir = Path('C:/Windows/Fonts')
pdfmetrics.registerFont(TTFont('Guide', str(fontdir / 'arial.ttf')))
pdfmetrics.registerFont(TTFont('GuideBold', str(fontdir / 'arialbd.ttf')))

styles = getSampleStyleSheet()
for name in ['Normal', 'BodyText', 'Heading1', 'Heading2', 'Heading3', 'Title']:
    styles[name].fontName = 'GuideBold' if name in ('Heading1', 'Heading2', 'Heading3', 'Title') else 'Guide'
    styles[name].textColor = colors.black
styles['Normal'].fontSize = 10.2
styles['Normal'].leading = 14.5
styles['BodyText'].fontSize = 10.2
styles['BodyText'].leading = 14.5
styles['BodyText'].spaceAfter = 7
styles['Title'].fontSize = 26
styles['Title'].leading = 31
styles['Title'].spaceAfter = 12
styles['Heading1'].fontSize = 20
styles['Heading1'].leading = 25
styles['Heading1'].spaceAfter = 10
styles['Heading2'].fontSize = 13.5
styles['Heading2'].leading = 18
styles['Heading2'].spaceBefore = 10
styles['Heading2'].spaceAfter = 6
styles['Heading3'].fontSize = 11.5
styles['Heading3'].leading = 15
styles['Heading3'].spaceBefore = 7
styles['Heading3'].spaceAfter = 4
styles.add(ParagraphStyle(name='Cell', fontName='Guide', fontSize=8.2, leading=10.7))
styles.add(ParagraphStyle(name='CellSmall', fontName='Guide', fontSize=7.4, leading=9.4))
styles.add(ParagraphStyle(name='HeadCell', fontName='GuideBold', fontSize=8.3, leading=10.5, textColor=colors.white))
styles.add(ParagraphStyle(name='Status', fontName='GuideBold', fontSize=9, leading=12, textColor=colors.HexColor('#27473f')))

story = []
def p(text, style='BodyText'):
    story.append(Paragraph(text, styles[style]))
def h(text, level=2):
    p(text, f'Heading{level}')
def page(text):
    if story:
        story.append(PageBreak())
    h(text, 1)
def table(headers, rows, widths, small=False):
    body_style = styles['CellSmall' if small else 'Cell']
    data = [[Paragraph(escape(str(c)), styles['HeadCell']) for c in headers]]
    for row in rows:
        data.append([Paragraph(escape(str(c)), body_style) for c in row])
    t = Table(data, colWidths=widths, repeatRows=1, hAlign='LEFT')
    t.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#263b36')),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor('#f2f5f3')]),
        ('GRID', (0,0), (-1,-1), .4, colors.HexColor('#d9d9d9')),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('LEFTPADDING', (0,0), (-1,-1), 6),
        ('RIGHTPADDING', (0,0), (-1,-1), 6),
        ('TOPPADDING', (0,0), (-1,-1), 5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 5),
    ]))
    story.append(t)
    story.append(Spacer(1, 8))
def footer(canvas, doc):
    canvas.setFont('Guide', 7.5)
    canvas.setFillColor(colors.HexColor('#5b6662'))
    canvas.drawString(48, 29, 'ASH & OATH  |  CURRENT GAME BREAKDOWN  |  17 SEPTEMBER 2026')
    canvas.drawRightString(564, 29, str(doc.page))

p('Ash and Oath Current Game Breakdown', 'Title')
p('A simple inventory of playable content, costs, rewards and visual assets', 'Heading2')
p('This document is a snapshot of the current codebase for evaluation. It separates content that is already live, content built and tested but awaiting deployment, and future concepts that are not yet implemented. Values are taken from the game source, not estimated from screenshots.')
h('At a glance')
table(['Area', 'Current amount', 'Evaluation note'], [
    ['Settlement tiers', '6', 'Complete early-to-late progression ladder.'],
    ['Dungeons', '3 dungeons, 15 stages', 'The largest current content limitation.'],
    ['Army gear', '4 weapon kits, 1 armor kit', 'Functional mixed loadouts; limited variety.'],
    ['Character loot', '5 weapon names, 5 armor names', 'One item identity per rarity; no equipment sets.'],
    ['Hidden discoveries', '5 runes, 5 companions', 'Companions have leveling and abilities.'],
    ['Loot chests', '3', 'Different odds and prices; all currently share one image.'],
    ['AI raid targets', '18', 'Three ranks for every settlement tier.'],
    ['Factions', '4', 'Each has one permanent gameplay bonus.'],
    ['Production illustrations', '15 WebP images plus favicon', 'Many systems still rely on icons or shared artwork.'],
], [120, 125, 271])
h('Release status')
table(['Status', 'Content'], [
    ['Live', 'Core economy, settlements, buildings, army and armory, three dungeons, loot, companions, chests, AI raids, real PvP, bank, leaderboard, factions, admin dashboard.'],
    ['Built and tested; deployment pending', 'Incoming attack log and increased settlement tribute. Firebase rejected the last deployment because the CLI login expired.'],
    ['Planned only', 'Twenty-dungeon roadmap, expanded character slots, armor sets, crafting, clans and alliances, companion evolutions, additional loot families.'],
], [145, 371])
h('Best evaluation questions')
p('Is the six-tier economy paced correctly? Are three dungeons enough for an alpha? Does the current ten-name loot pool create meaningful collection? Do players have enough decisions after finishing settlement upgrades? Those are the main product questions exposed by this inventory.')

page('New player start and core economy')
h('Starting account')
table(['Starting value', 'Amount or item'], [
    ['Gold', '1,800'], ['Action Points', '36 of 60'], ['Settlement', 'Homestead'],
    ['Offensive soldiers', '6, armed with militia blades'], ['Defensive soldiers', '4, armed with militia blades'],
    ['Character weapon', "Traveler's Blade - common - 14 power - sells for 45 gold"],
    ['Character armor', 'Weathered Leathers - common - 10 power - sells for 35 gold'],
    ['Buildings', 'None'], ['Faction', 'Not selected'],
    ['Storage limits', '200 character items; up to 1,000 of each army kit per role'],
], [155, 361], small=True)
h('Automatic resources')
table(['Rule', 'Current behavior'], [
    ['Turn length', '5 minutes'], ['AP recovery', '5 AP per turn'], ['AP cap', '60'],
    ['Offline limit', '144 turns or 12 hours per absence'],
    ['Gold destination', 'Tribute goes to exposed treasury, not the bank'],
    ['Bank interest', 'Shares the same 12-hour offline limit'],
], [155, 361], small=True)
h('Main gold sources')
p('Settlement tribute, dungeon victories, AI stronghold bounties, real-player PvP plunder, item sales and bank interest. Gold pays for settlement upgrades, buildings, recruits, unit equipment, chests, bank and barracks upgrades, companion treatment and faction contributions. Personal expedition extraction is free.')
h('Main AP costs')
table(['Activity', 'AP'], [['Army dungeon raid', '5'], ['Personal dungeon expedition battle', '7'], ['AI stronghold raid', '8'], ['Real-player PvP attack', '8']], [300, 216], small=True)

page('Settlement upgrades')
p('Settlement upgrades raise passive tribute, base troop capacity and milestone access. Costs and base capacity are live. The higher tribute values are built and tested but still await deployment; the live site retains the previous values until Firebase deployment succeeds.')
settlements = [
    ['Homestead','Starting home','30','30','20','Armory'],
    ['Settlement','800','45','65','30','Bank, Blacksmith, Trader, Watchtower, spears, PvP'],
    ['Village','6,000','70','140','45','Personal expeditions, longbows'],
    ['Castle','22,000','110','290','70','Royal halberds'],
    ['Stronghold','65,000','170','600','110','Higher income and capacity'],
    ['Citadel','160,000','250','1,200','160','Maximum settlement tier'],
]
table(['Tier','Upgrade cost','Live gold / turn','Prepared gold / turn','Base beds','What it gives'], settlements, [75,72,75,84,55,155], small=True)
h('Prepared income payback')
table(['Upgrade', 'Incremental tribute payback'], [['Settlement','1.9 collected hours'],['Village','6.7 collected hours'],['Castle','12.2 collected hours'],['Stronghold','17.5 collected hours'],['Citadel','22.2 collected hours']], [245, 271])
p('Payback uses the added tribute over the previous tier, before the Verdant faction bonus. It excludes raids, loot sales, bank interest and spending. Existing accounts receive the prepared income automatically when it is deployed.')
h('Troop capacity formula')
p('Total capacity equals the settlement base beds plus 20 beds for every barracks expansion. A Citadel with all 20 barracks levels can hold 560 soldiers.')

page('Buildings and permanent upgrades')
table(['Building', 'Unlock', 'Cost', 'What it gives'], [
    ['Armory','Homestead','300','Recruit, transfer and organize offensive and defensive troops; unlock barracks expansions.'],
    ['Bank','Settlement','1,000','Protected savings; 5% deposit fee rounded up; free withdrawals; level-based interest.'],
    ['Blacksmith','Settlement','400','Purchase and assign army weapons and padded armor.'],
    ['Trading Post','Settlement','250','Buy loot chests and sell unequipped character items.'],
    ['Watchtower','Settlement','350','Adds 30 base realm defense and links to war defenses.'],
], [95,70,60,291], small=True)
h('Bank levels')
bank = [
    ['1','Build for 1,000','5,000','0.001%'], ['2','2,000','10,000','0.002%'],
    ['3','4,000','20,000','0.003%'], ['4','8,000','40,000','0.004%'],
    ['5','16,000','80,000','0.005%'], ['6','32,000','160,000','0.006%'],
    ['7','64,000','320,000','0.007%'], ['8','128,000','640,000','0.008%'],
]
table(['Level','Cost to reach','Capacity','Interest / 5 min'], bank, [75,130,145,166], small=True)
p('Interest compounds into protected savings, carries fractional gold forward and stops at capacity. Deposits destroy 5% of the transferred amount. Withdrawn gold becomes spendable and exposed to PvP.')
h('Barracks levels 1 through 10')
barracks_costs = [600,810,1094,1476,1993,2690,3632,4903,6619,8936,12064,16286,21987,29682,40070,54095,73028,98588,133094,179677]
table(['Level','Cost','Added beds','Total added'], [[i+1,f'{c:,}','20',f'{20*(i+1)}'] for i,c in enumerate(barracks_costs[:10])], [90,145,130,151], small=True)

page('Barracks levels 11 through 20 and factions')
table(['Level','Cost','Added beds','Total added'], [[i+11,f'{c:,}','20',f'{20*(i+11)}'] for i,c in enumerate(barracks_costs[10:])], [90,145,130,151])
h('Faction choices')
table(['Faction','Motto','Permanent bonus'], [
    ['Iron Covenant','Together, unbroken.','+5% army attack'],
    ['Verdant Pact','From roots, we rise.','+5% tribute income'],
    ['Ashen Order','Through fire, truth.','+10% personal expedition strength'],
    ['Tidebound','No crown owns the sea.','+5% realm defense'],
], [130,170,216])
p('The first faction choice is free. A player may change faction once per shared 28-day season. Points already earned remain with the old faction. Same-faction PvP is allowed but awards no renown. Alliances and clans are not implemented.')
h('Campaign scoring')
p('Ordinary dungeon wins award 5, 10 or 15 renown by dungeon. Boss wins award 30, 60 or 90. A real PvP win against another faction awards 20. Gold contributions award 1 renown per 20 gold, in multiples of 100, with a daily contribution cap of 2,000 gold. AI raids award no renown.')

page('Army, recruitment and equipment')
h('Army structure')
p('Soldiers are assigned to offense or defense. Offensive soldiers can attack players, AI strongholds and dungeons. Defensive soldiers protect the realm and cannot be deployed. Recruiting costs 60 gold per soldier, and every recruit arrives without a weapon or armor. Transfers are free, but transferred soldiers arrive unequipped; their old gear remains in the source armory.')
table(['Army kit','Unlock','Cost each','Soldier strength','Special use'], [
    ['Militia blades','Homestead + Blacksmith','50','12 total (4 base + 8 weapon)','Basic kit'],
    ['Sentinel spears','Settlement + Blacksmith','70','15 total (4 + 11)','Up to +10% vs Charging'],
    ['Ranger longbows','Village + Blacksmith','100','18 total (4 + 14)','Up to +10% vs Channeling'],
    ['Royal halberds','Castle + Blacksmith','150','22 total (4 + 18)','Up to +10% vs Fortified'],
    ['Padded armor','Settlement + Blacksmith','80','No attack gain','+4 defense on garrison; up to 20% fewer dungeon casualties'],
], [100,105,62,100,149], small=True)
h('Equipment rules')
p('A role can mix weapon types. Buying to storage does not equip the kit; buying and equipping is atomic. Reusing stored gear is free. Assigning a stronger weapon fills unarmed soldiers first, then returns weaker assigned weapons to storage. Offensive gear is locked during a personal expedition. Defensive gear remains manageable.')
h('Casualties')
p('Dungeon and losing PvP casualties permanently destroy the fallen soldiers assigned weapons and armor. Unarmed and unarmored soldiers are lost first; stored kits and gear assigned to undeployed reserves remain safe. Winning AI or PvP battles cause no offensive casualties. Dungeon victories always lose at least one deployed soldier.')
h('Power summary')
p('Army attack combines 4 base strength per offensive soldier plus each assigned weapon. Defense combines 4 base strength per defender, defensive weapons, 4 per padded armor kit and 30 from the Watchtower. Faction, rune and companion bonuses then apply.')

page('Dungeons and stage rewards')
p('There are three dungeons with five stages each. Clearing stages unlocks the next stage; clearing stage five unlocks the next dungeon. Cleared stages remain farmable. Gold varies from 90% to 110% of the table value. Personal expeditions add 50% gold before companion Scavenger bonuses.')
table(['Dungeon / stage','Enemy','Base gold','Renown','Encounter'], [
    ['Whispering Woods 1','55','180','5','The Forgotten Path'],['Whispering Woods 2','85','260','5','Briar Hollow'],['Whispering Woods 3','120','380','5','The Sunken Shrine'],['Whispering Woods 4','165','520','5',"Watcher's Crossing"],['Whispering Woods Boss','220','850','30','The Thornbound Guardian'],
    ['Hollowcrypt 1','260','600','10','The Silent Stair'],['Hollowcrypt 2','340','780','10','Hall of Echoes'],['Hollowcrypt 3','430','1,000','10','The Bone Archive'],['Hollowcrypt 4','530','1,350','10','The Kingless Court'],['Hollowcrypt Boss','660','2,100','60','The Oathless King'],
    ['Ember Citadel 1','740','1,500','15','The Cinder Gate'],['Ember Citadel 2','900','1,900','15','Furnace of Names'],['Ember Citadel 3','1,100','2,400','15','Ashfall Bridge'],['Ember Citadel 4','1,350','3,200','15','The Crimson Spire'],['Ember Citadel Boss','1,700','4,800','90','The Last Flame'],
], [135,55,70,55,201], small=True)
h('Army raid versus personal expedition')
table(['Mode','Requirement and risk'], [
    ['Army raid - 5 AP','Choose 1 or more offensive soldiers. Rewards bank immediately. Character gear is safe.'],
    ['Personal - 7 AP','Village required. Character joins party and earns +50% gold. Rewards stay in a satchel until free extraction.'],
    ['Personal defeat','Equipped non-companion character gear and the entire satchel are lost. Bonded companion survives injured.'],
], [130,386])

page('Dungeon combat and loot odds')
table(['Formation','Power','Casualty multiplier','Counters'], [
    ['Balanced','100%','1.0','Fortified'],['Aggressive','115%','1.7','Channeling'],['Guarded','90%','0.5','Charging'],
], [115,100,155,146])
p('Matching the enemy behavior adds 20% strength and reduces casualties by another 25%. Matching spears, longbows or halberds adds up to 10% strength based on party coverage. Every combat also rolls uniformly from 0.85x to 1.15x final strength.')
h('Dungeon casualty rules')
p('Victory starts at 4% of deployed troops on normal stages and 8% on bosses, then formation, counter, armor and companion protection modify it. At least one soldier dies. Defeat starts at 45% before the same protection modifiers. Exact forecasts are visible only to administrators; players see qualitative danger and the actual result.')
h('Loot probability by dungeon')
table(['Dungeon','Common','Uncommon','Rare','Epic','Legendary','Rune','Companion'], [
    ['Whispering Woods','43%','36%','18%','2.8%','0.2%','4%','1%'],
    ['Hollowcrypt','10%','38%','42%','9%','1%','8%','2%'],
    ['Ember Citadel','0%','16%','54%','26%','4%','14%','4%'],
], [110,58,65,55,52,65,52,59], small=True)
p('Normal victories have a 65% chance to produce character weapon or armor. Bosses always produce at least rare gear. Rune and companion rolls are independent, so one battle can yield multiple items. Runes stay hidden from players until their first discovery.')
h('Character item power by rarity and dungeon')
table(['Rarity','Name examples','Woods / chest','Hollowcrypt','Ember Citadel','Sell'], [
    ['Common','Iron Longsword / Scout Jerkin','16-21','20-26','25-31','45'],
    ['Uncommon',"Warden's Edge / Briarhide Coat",'25-30','32-38','40-45','80'],
    ['Rare',"Moonsteel Saber / Sentinel's Plate",'42-47','54-60','67-73','160'],
    ['Epic','Oathkeeper / Mantle of the Fallen','70-75','91-96','112-117','380'],
    ['Legendary','Dawnbringer / Aegis of the First King','115-120','149-155','184-189','900'],
], [78,190,75,74,78,45], small=True)

page('Character loot, runes and chests')
h('Current character equipment slots')
p('One weapon, one armor, up to two runes and one companion can be equipped. The proposed helm, chest, gloves, greaves, boots, off-hand and accessory system is not implemented. Armor sets and set bonuses are not implemented.')
h('Current generated loot names')
table(['Rarity','Weapon','Armor','Rune','Companion'], [
    ['Common','Iron Longsword',"Scout's Jerkin",'Rune of Resolve','Woodland Fox'],
    ['Uncommon',"Warden's Edge",'Briarhide Coat','Rune of Vigor','Mossback Owl'],
    ['Rare','Moonsteel Saber',"Sentinel's Plate",'Rune of Ascendance','Silverfang Wolf'],
    ['Epic','Oathkeeper','Mantle of the Fallen','Rune of the Ancients','Ember Drake'],
    ['Legendary','Dawnbringer','Aegis of the First King','Rune of Eternity','Dawn Phoenix'],
], [72,115,130,117,82], small=True)
h('Rune power')
table(['Rune','Bonus'], [['Resolve','3%'],['Vigor','4%'],['Ascendance','6%'],['the Ancients','9%'],['Eternity','12%']], [320,196])
p('Equip up to two runes. Their combined bonus is capped at 30%. Runes affect army attack, realm defense and personal strength. Runes can be lost on personal expedition defeat.')
h('Loot chests')
table(['Chest','Cost','Common','Uncommon','Rare','Epic','Legendary'], [
    ["Wayfarer's Chest",'250','55%','30%','12%','2.5%','0.5%'],
    ["Warlord's Chest",'800','10%','38%','40%','10%','2%'],
    ["Sovereign's Chest",'2,400','0%','10%','50%','32%','8%'],
], [120,58,58,68,55,55,74], small=True)
p('Chests require the Trading Post and contain equipment only: 50% weapon, 50% armor. After nine consecutive results below epic, the tenth chest upgrades a sub-epic roll to epic. The guarantee counter is shared by all chest tiers and resets on epic or legendary.')

page('Companions')
p('One companion can be bonded at a time. All species correspond to rarity. A companion adds strength and dungeon casualty protection while healthy. Every new companion also rolls 0.00 to 2.00 percentage points of innate quality and one random ability with a separate 0.00 to 2.00 roll.')
table(['Rarity','Species','Base bonus','Portrait'], [
    ['Common','Woodland Fox','2%','companion-0.webp'],['Uncommon','Mossback Owl','3%','companion-1.webp'],['Rare','Silverfang Wolf','4%','companion-2.webp'],['Epic','Ember Drake','5%','companion-3.webp'],['Legendary','Dawn Phoenix','6%','companion-4.webp'],
], [90,145,100,181])
h('Leveling')
p('Companion level cap is 500. Wins grant 20 XP, dungeon boss wins grant 40 XP and defeats grant 5 XP. Each level adds 0.02 percentage points to the strength and protection bonus. Total XP to level L is 100 x (L - 1) + 2 x (L - 1) x (L - 2).')
h('Random abilities')
table(['Ability','Effect'], [['Ferocity','Additional army attack multiplier.'],['Guardian','Additional dungeon casualty reduction.'],['Scavenger','Additional dungeon gold; never affects real PvP plunder.']], [130,386])
p('Ability strength begins at 1% plus its 0.00 to 2.00 roll, then adds 0.004 percentage points per level. Companions do not permanently die. A defeat injures the bonded companion for 30 minutes; treatment costs 120 gold. Injured companions provide no bonus or XP.')

page('AI strongholds')
p('There are 18 AI raid targets: three ranks at every settlement tier. Players may attack targets within one tier for 8 AP. Each target has a 30-minute personal cooldown. Up to 12 victories per UTC day pay gold; defeats do not consume the daily win allowance. AI raids do not require PvP enlistment or verified email and award no renown.')
ai = [
    ['Homestead','Bramble Camp','36','400'],['Homestead','Copperhill Hold','72','600'],['Homestead','Red Fox Outpost','120','880'],
    ['Settlement','Morrowstead','120','800'],['Settlement','Blackwater Crossing','210','1,200'],['Settlement','Iron Crow Keep','320','1,760'],
    ['Village','Saltwind Village','260','1,400'],['Village','Grimwatch','400','2,100'],['Village','The Wolf Court','600','3,080'],
    ['Castle','Ravenstone Castle','500','2,200'],['Castle','Stormglass Bastion','750','3,300'],['Castle','The Gilded Marshal','1,100','4,840'],
    ['Stronghold','Ashgate Stronghold','900','3,400'],['Stronghold','The Hollow Crown','1,400','5,100'],['Stronghold','Dreadspire','2,000','7,480'],
    ['Citadel','Ivory Citadel','1,500','5,000'],['Citadel','The Obsidian Throne','2,300','7,500'],['Citadel','The Last Warlord','3,200','11,000'],
]
table(['Tier','Target','Defense','Bounty'], ai, [105,225,85,101], small=True)
p('A win causes no casualties. A defeat consumes AP, starts the cooldown and loses up to 5% of attackers with Guarded, 10% with Balanced or 20% with Aggressive. At least one offensive soldier survives. Lost soldiers can destroy equipped army gear.')

page('Real-player PvP, rankings and attack history')
h('Entry and matchmaking')
p('Real PvP requires a faction, Settlement tier, verified email and explicit enlistment by both players. Targets must be within one settlement tier. Same-faction attacks are allowed. An attack costs 8 AP, drops the attackers shield and cannot occur during a personal expedition.')
h('Plunder')
table(['Rolled power / defense','Result','Share of exposed treasury'], [['Below 1.0','Defeat','0%'],['1.0 to under 1.2','Narrow victory','15% to 40%'],['1.2 to under 1.5','Solid victory','40% to 70%'],['1.5 to under 2.0','Decisive victory','65% to 90%'],['2.0 or more','Dominant victory','90% to 98%']], [185,150,181])
p('The exact share is independently randomized within the band. Bank savings, inventory and expedition satchels are protected. A successful cross-faction attack awards 20 renown; same-faction attacks award zero. Victims receive a one-hour recovery shield. Repeat attacks on one target require ten minutes.')
h('Defender and attacker losses')
p('Current PvP does not kill defenders or destroy defender gear. Failed attackers lose up to 5%, 10% or 20% by formation, with at least one survivor. Buildings are never destroyed.')
h('Attack log status')
p('The detailed incoming attack log is built and tested but not yet deployed. It records attacker, time, outcome, rolled attack versus defense, exact gold loss, troop and gear losses and recovery-shield expiry. It preserves 50 reports and unread status across devices. Older attacks continue to appear only in the general activity feed.')
h('Overall leaderboard')
p('The War Room shows the top 50 saved realms by overall power. Overall power equals army attack plus realm defense plus twice character attack and character defense. Stored items and wealth do not count. Ties share a rank.')

page('Current screens and administrator tools')
table(['Screen','What is available'], [
    ['Overview','Settlement scene, resources, realm progress, next actions, latest activity and dungeon shortcut.'],
    ['Settlement','Tier upgrade, benefits, payback preview, building construction and building navigation.'],
    ['Army','Offense/defense totals, power, weapon and armor gaps, weapon mix, barracks, recruitment and transfers.'],
    ['Armory','Role selector, equipment catalog, stored/equipped counts, buy/equip/store orders and replacement previews.'],
    ['Your character','Inventory, equipped gear, comparisons, rune discovery state and companion details.'],
    ['Dungeons','Three areas, stage progression, party size, formation, army/personal modes, boss presentation and battle logs.'],
    ['War Room','AI strongholds, nearby players, PvP status, bank, faction contribution and overall leaderboard.'],
    ['Trader','Three chests with odds and guarantee progress; sell unequipped loot.'],
    ['Settings and guide','Sound, account/save status, instructional guide and activity history.'],
], [125,391], small=True)
h('Administrator dashboard')
p('The verified administrator can play normally and switch to a separate dashboard. It shows player count, PvP enlistment and suspension totals; searches players by exact email or ID; browses 25 realms per page; reviews treasury, bank, AP, renown, faction and tier; suspends or restores accounts with an audit reason; and runs read-only dungeon forecasts for selected players. It does not directly edit player gold or equipment.')
h('Security and persistence')
p('Firebase Authentication supports email/password and Google sign-in. Game actions are validated and executed by server functions in Firestore transactions with revision checks and replay receipts. Direct client progress writes are denied. Player names have a server-side profanity filter. Admin access is invitation and role based.')

page('Current visual assets')
p('The production game currently contains 15 WebP illustrations and one SVG favicon. Gear, runes, faction identity, buildings, regular dungeon enemies and AI rivals do not yet have dedicated artwork.')
table(['Production file','Current use'], [
    ['favicon.svg','Browser/app icon'],
    ['art/chest.webp','Shared by all three chest tiers'],
    ['art/companion-0.webp','Woodland Fox / common companion'],['art/companion-1.webp','Mossback Owl / uncommon companion'],['art/companion-2.webp','Silverfang Wolf / rare companion'],['art/companion-3.webp','Ember Drake / epic companion'],['art/companion-4.webp','Dawn Phoenix / legendary companion'],
    ['art/dungeon.webp','Whispering Woods entrance and general dungeon scene'],['art/thornbound-boss.webp','Thornbound Guardian boss'],
    ['art/crypt.webp','Hollowcrypt entrance'],['art/oathless-boss.webp','Oathless King boss'],
    ['art/ember.webp','Ember Citadel entrance'],['art/flame-boss.webp','Last Flame boss'],
    ['art/homestead.webp','Homestead scene'],['art/village.webp','Settlement and Village scenes'],['art/stronghold.webp','Castle, Stronghold and Citadel scenes; also war fortress'],
], [215,301], small=True)
h('Current artwork gaps')
table(['Missing dedicated art','Count or scope'], [
    ['Army equipment','4 weapons and padded armor'],['Character equipment','Starter pair plus 10 generated loot items'],['Chests','Unique open/closed art for each of 3 tiers'],['Settlement progression','Dedicated Settlement, Castle and Citadel scenes'],['Buildings','Armory, barracks, bank, blacksmith, trader and watchtower'],['Factions','4 emblems, banners and commander portraits'],['Dungeons','12 stage scenes, 3 boss arenas and regular enemies'],['Runes','5'],['AI and player presentation','18 AI identities and reusable avatars'],
], [265,251], small=True)

page('What is planned but not currently in the game')
table(['Planned concept','Current reality'], [
    ['Twenty dungeons across five regions','Only Whispering Woods, Hollowcrypt and Ember Citadel exist.'],
    ['Expanded equipment slots','Only one weapon, one armor, two runes and one companion are implemented for the character.'],
    ['Helms, chest pieces, gloves, greaves, boots, off-hand and accessory','Not implemented. Current armor is one broad slot.'],
    ['Armor sets and 2/3/5-piece bonuses','Not implemented. Five set themes in the asset guide are proposals.'],
    ['Large procedural loot pool with affixes','Not implemented. There are 10 generated gear names and power varies mainly by rarity and dungeon.'],
    ['Crafting, salvage, rerolls, upgrades and materials','Not implemented. Items can currently be equipped, unequipped or sold.'],
    ['Saved character loadouts and item locking','Not implemented.'],
    ['Clans and mutual alliances','Not implemented. Factions are seasonal teams, not alliances.'],
    ['Territory control and automatic seasonal rewards','Not implemented. Faction score exists; future reward delivery is undecided.'],
    ['Cooperative raids and faction bosses','Not implemented.'],
    ['Companion evolutions, skins or permanent death','Not implemented. Companions level, roll one ability and become temporarily injured.'],
], [235,281], small=True)
h('Straight evaluation')
p('<b>Strongest current systems:</b> server-authoritative progression, mixed army equipment, meaningful formation counters, partial troop deployment, risky personal expeditions, protected bank, AI income ladder and real PvP plunder bands.')
p('<b>Most limited current systems:</b> dungeon quantity, character equipment slots, loot identity variety, visual coverage and long-term seasonal rewards.')
p('<b>Highest-value expansion order:</b> define the expanded character item model and armor-set rules; add one complete fourth dungeon with its own enemies and loot; improve inventory filtering and comparisons; then scale content using the approved structure. This avoids creating hundreds of images for mechanics that may change.')
h('Source and status note')
p('Snapshot taken from src/game/data.ts, engine.ts, progression.ts, rivals.ts, companions.ts, online.ts, current React screens, Firebase functions and public/art on 17 September 2026. The attack log and prepared income curve passed local engine, backend and browser tests, but remain pending production deployment because Firebase CLI credentials expired.')

doc = SimpleDocTemplate(str(PDF), pagesize=letter, rightMargin=48, leftMargin=48, topMargin=44, bottomMargin=48, title='Ash and Oath Current Game Breakdown', author='Ash and Oath development')
doc.build(story, onFirstPage=footer, onLaterPages=footer)
print(PDF)
