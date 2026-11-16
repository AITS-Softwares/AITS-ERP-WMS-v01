from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfbase import pdfmetrics
from pathlib import Path

out = Path('output/pdf/wms-overview-and-workflow-guide.pdf')
NAVY = colors.HexColor('#10233c'); CYAN = colors.HexColor('#087e8b'); PALE = colors.HexColor('#eaf7f8'); INK = colors.HexColor('#243247'); MUTED = colors.HexColor('#566579'); BORDER = colors.HexColor('#d9e2ec'); GOLD = colors.HexColor('#f0b44c')
styles = getSampleStyleSheet()
styles.add(ParagraphStyle(name='CoverTitle', parent=styles['Title'], fontName='Helvetica-Bold', fontSize=25, leading=30, alignment=TA_LEFT, textColor=NAVY, spaceAfter=8))
styles.add(ParagraphStyle(name='Sub', parent=styles['Normal'], fontSize=11, leading=16, textColor=MUTED, spaceAfter=10))
styles.add(ParagraphStyle(name='H1x', parent=styles['Heading1'], fontSize=17, leading=21, textColor=NAVY, spaceBefore=5, spaceAfter=9))
styles.add(ParagraphStyle(name='H2x', parent=styles['Heading2'], fontSize=11, leading=14, textColor=CYAN, spaceBefore=6, spaceAfter=4))
styles.add(ParagraphStyle(name='Bodyx', parent=styles['BodyText'], fontSize=9, leading=13, textColor=INK, spaceAfter=5))
styles.add(ParagraphStyle(name='Smallx', parent=styles['BodyText'], fontSize=8, leading=11, textColor=MUTED, spaceAfter=3))
styles.add(ParagraphStyle(name='Box', parent=styles['BodyText'], fontSize=9, leading=13, textColor=NAVY, alignment=TA_CENTER))
styles.add(ParagraphStyle(name='Flow', parent=styles['BodyText'], fontSize=8.5, leading=11, textColor=INK, alignment=TA_CENTER))
P=lambda t, s='Bodyx': Paragraph(t, styles[s])

def footer(canvas, doc):
    canvas.saveState(); w,h=A4
    canvas.setStrokeColor(BORDER); canvas.line(18*mm, 15*mm, w-18*mm, 15*mm)
    canvas.setFont('Helvetica', 8); canvas.setFillColor(MUTED)
    canvas.drawString(18*mm, 10*mm, 'AITSERP WMS | New user and client guide')
    canvas.drawRightString(w-18*mm, 10*mm, f'{doc.page}')
    canvas.restoreState()

doc=SimpleDocTemplate(str(out),pagesize=A4,rightMargin=18*mm,leftMargin=18*mm,topMargin=17*mm,bottomMargin=21*mm,title='AITSERP WMS - Overview and Workflow Guide',author='AITSERP WMS')
story=[]
story += [P('AITSERP WMS','Smallx'), P('Warehouse operations,<br/>made simple','CoverTitle'), P('A plain-language overview and step-by-step flow for warehouse teams, business users, and clients getting to know the system.','Sub')]
# Callout
call=Table([[P('<b>In one sentence</b><br/>The WMS helps the team receive goods, organize where they are stored, see stock, and prepare customer orders for dispatch.','Bodyx')]],colWidths=[174*mm])
call.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,-1),PALE),('BOX',(0,0),(-1,-1),.7,CYAN),('LEFTPADDING',(0,0),(-1,-1),12),('RIGHTPADDING',(0,0),(-1,-1),12),('TOPPADDING',(0,0),(-1,-1),10),('BOTTOMPADDING',(0,0),(-1,-1),7)])); story += [call,Spacer(1,12),P('The big picture','H1x'),P('Think of the WMS as the warehouse team’s workbench. It gives staff focused screens for warehouse tasks, while ERPNext provides the connected business records for stock, purchase orders, warehouses, units, and barcode records. A user signs in, opens the WMS Control Center, then follows the task links or left-hand menu.','Bodyx')]
# flow visual
flow=[P('<b>1. PLAN</b><br/>Purchase order','Flow'),P('&gt;','Box'),P('<b>2. RECEIVE</b><br/>Count and record<br/>GRN','Flow'),P('&gt;','Box'),P('<b>3. STORE</b><br/>Choose warehouse<br/>and location','Flow'),P('&gt;','Box'),P('<b>4. FULFIL</b><br/>Pick, scan and<br/>dispatch','Flow'),P('&gt;','Box'),P('<b>5. REVIEW</b><br/>Reports and<br/>stock checks','Flow')]
t=Table([flow],colWidths=[27*mm,7*mm,30*mm,7*mm,30*mm,7*mm,30*mm,7*mm,29*mm])
t.setStyle(TableStyle([('BACKGROUND',(0,0),(0,0),PALE),('BACKGROUND',(2,0),(2,0),PALE),('BACKGROUND',(4,0),(4,0),PALE),('BACKGROUND',(6,0),(6,0),PALE),('BACKGROUND',(8,0),(8,0),PALE),('BOX',(0,0),(0,0),.5,BORDER),('BOX',(2,0),(2,0),.5,BORDER),('BOX',(4,0),(4,0),.5,BORDER),('BOX',(6,0),(6,0),.5,BORDER),('BOX',(8,0),(8,0),.5,BORDER),('VALIGN',(0,0),(-1,-1),'MIDDLE'),('TOPPADDING',(0,0),(-1,-1),12),('BOTTOMPADDING',(0,0),(-1,-1),12)])); story += [t,Spacer(1,10),P('What connects to what?','H2x'),P('<b>WMS screens</b> → warehouse user actions → connected ERPNext records. For example, a purchase order can be reviewed in the WMS, a receipt recorded as a GRN, and outbound work handled from Sales Dispatch. ERPNext is described by the app as the source of truth for stock and core warehouse master data.','Bodyx'),P('The home dashboard can show sample presentation figures or live ERPNext figures. Check which mode is selected before treating dashboard counts as current operational data.','Smallx'),PageBreak()]
story += [P('The daily workflow','H1x'),P('Follow these stages in order. Your exact menu access depends on your user role and the records available to your company.','Sub')]
steps=[('1. Get ready','Sign in and open <b>Control Center</b>. Confirm the ERPNext connection is set up if live records do not load. Make sure the correct company and warehouse are being used.'),('2. Check the purchase order','Open <b>Purchase Orders</b> and find the order for the incoming delivery. Use the order details to confirm the expected items and quantities.'),('3. Receive the delivery','Open <b>GRN</b> and record what physically arrived. Compare delivered items and quantities with the order. Save/submit the receipt according to your team’s process; report shortages or damage before completing it.'),('4. Put stock away','Use the warehouse and location setup to identify where stock belongs. Location masters can include <b>racks → shelves → bins</b>. Carton creation and barcode tools support labeling and handling.'),('5. Fulfil a customer order','Open <b>Sales Dispatch</b>, choose an order in the queue, review remaining quantities, then pick/scan the requested goods and warehouse location. Confirm the quantities before submitting the dispatch action.'),('6. Check the result','Use <b>Reports</b> and stock views to review balances, capacity, or dispatch history. If something looks wrong, check the source transaction and item/location details with the responsible lead.')]
for title,body in steps:
    row=Table([[P(title,'H2x'),P(body,'Bodyx')]],colWidths=[42*mm,132*mm]); row.setStyle(TableStyle([('VALIGN',(0,0),(-1,-1),'TOP'),('LINEBELOW',(0,0),(-1,-1),.5,BORDER),('LEFTPADDING',(0,0),(-1,-1),5),('RIGHTPADDING',(0,0),(-1,-1),7),('TOPPADDING',(0,0),(-1,-1),7),('BOTTOMPADDING',(0,0),(-1,-1),6)])); story.append(row)
story += [Spacer(1,9)]
call=Table([[P('<b>Quick flow to remember</b><br/>Purchase order &gt; physical delivery check &gt; GRN &gt; put-away/location &gt; sales order &gt; pick and scan &gt; dispatch &gt; report','Bodyx')]],colWidths=[174*mm]); call.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,-1),PALE),('BOX',(0,0),(-1,-1),.6,CYAN),('LEFTPADDING',(0,0),(-1,-1),10),('TOPPADDING',(0,0),(-1,-1),8),('BOTTOMPADDING',(0,0),(-1,-1),5)])); story.append(call)
story += [PageBreak(),P('People, menus, and key terms','H1x'),P('A quick reference for new staff and client stakeholders.','Sub')]
rows=[[P('<b>Who</b>','Smallx'),P('<b>Typical focus</b>','Smallx')],[P('Warehouse operator','Bodyx'),P('Receive deliveries, record GRNs, place stock, pick and dispatch orders.','Bodyx')],[P('Warehouse lead / manager','Bodyx'),P('Monitor queues and stock, resolve exceptions, review reports, and maintain operating discipline.','Bodyx')],[P('ERP / system administrator','Bodyx'),P('Maintain ERPNext connection and master data, manage users and role access, and support configuration.','Bodyx')],[P('Client / business user','Bodyx'),P('Follow order and stock progress, confirm the right records are used, and review agreed reports. Menu access may differ by role.','Bodyx')]]
t=Table(rows,colWidths=[48*mm,126*mm],repeatRows=1); t.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,0),NAVY),('TEXTCOLOR',(0,0),(-1,0),colors.white),('GRID',(0,0),(-1,-1),.45,BORDER),('VALIGN',(0,0),(-1,-1),'TOP'),('ROWBACKGROUNDS',(0,1),(-1,-1),[colors.white,colors.HexColor('#f5f8fb')]),('LEFTPADDING',(0,0),(-1,-1),8),('RIGHTPADDING',(0,0),(-1,-1),8),('TOPPADDING',(0,0),(-1,-1),7),('BOTTOMPADDING',(0,0),(-1,-1),5)])); story += [t,Spacer(1,10),P('Menu at a glance','H2x')]
rows=[[P('<b>Menu</b>','Smallx'),P('<b>Use it for</b>','Smallx')]]
for a,b in [('Control Center','Starting point and WMS overview'),('Purchase Orders / GRN','Incoming stock and receiving records'),('Items / Warehouses / UOM','Product, warehouse, and unit reference data'),('Location Masters','Rack, shelf, and bin structure'),('Carton Creation','Carton setup and barcode-oriented handling'),('Sales Dispatch','Pick and process outbound customer orders'),('Reports','Review operational data and export available reports'),('ERPNext Connection','Connection setup and troubleshooting')]: rows.append([P(a,'Bodyx'),P(b,'Bodyx')])
t=Table(rows,colWidths=[57*mm,117*mm],repeatRows=1); t.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,0),PALE),('GRID',(0,0),(-1,-1),.4,BORDER),('VALIGN',(0,0),(-1,-1),'TOP'),('LEFTPADDING',(0,0),(-1,-1),7),('RIGHTPADDING',(0,0),(-1,-1),7),('TOPPADDING',(0,0),(-1,-1),5),('BOTTOMPADDING',(0,0),(-1,-1),4)])); story += [t,Spacer(1,8),P('Plain-language glossary','H2x')]
terms='<b>ERPNext:</b> Connected business system that holds core stock and purchasing records. &nbsp; <b>GRN:</b> Goods Receipt Note - record of goods received. &nbsp; <b>UOM:</b> Unit of Measure, such as each, box, or kg. &nbsp; <b>Put-away:</b> Moving received stock to its assigned storage place. &nbsp; <b>Dispatch:</b> Preparing and recording goods leaving the warehouse for an order.'
story += [P(terms,'Smallx'),Spacer(1,6),P('<b>Before you finish a transaction:</b> check the item, quantity, warehouse/location, and order reference. Follow your company’s approval and exception process for differences. This guide summarizes the WMS screens and flow found in the application; local operating procedures and permissions still apply.','Smallx')]
doc.build(story,onFirstPage=footer,onLaterPages=footer)
print(out.resolve())

