import { Product, MacroPreset } from './types';

export const INITIAL_PRODUCTS: Product[] = [
  // Bakery & Cafe
  { id: 'p1', name: 'Premium Espresso', sku: 'CAF-ESP-01', price: 3.50, cost: 0.80, stock: 120, minStock: 25, category: 'Cafe', color: 'from-amber-700 to-amber-900' },
  { id: 'p2', name: 'Almond Croissant', sku: 'CAF-BAK-08', price: 4.25, cost: 1.20, stock: 45, minStock: 10, category: 'Cafe', color: 'from-amber-500 to-amber-700' },
  { id: 'p3', name: 'Cold Brew Infusion', sku: 'CAF-CLD-03', price: 4.75, cost: 0.95, stock: 80, minStock: 15, category: 'Cafe', color: 'from-amber-800 to-stone-900' },
  
  // Workspace Passes
  { id: 'p4', name: 'Daily Hotdesk Pass', sku: 'WSP-DAY-50', price: 25.00, cost: 2.00, stock: 50, minStock: 5, category: 'Workspace', color: 'from-indigo-600 to-violet-800' },
  { id: 'p5', name: 'Conference Room (Hr)', sku: 'WSP-MTR-12', price: 45.00, cost: 5.00, stock: 12, minStock: 2, category: 'Workspace', color: 'from-blue-600 to-cyan-800' },
  
  // Goods & Merchandise
  { id: 'p6', name: 'Stitch Leather Notebook', sku: 'MER-NBT-01', price: 18.00, cost: 6.50, stock: 35, minStock: 8, category: 'Goods', color: 'from-emerald-600 to-teal-800' },
  { id: 'p7', name: 'Minimalist Steel Flask', sku: 'MER-FLK-02', price: 22.00, cost: 8.00, stock: 24, minStock: 5, category: 'Goods', color: 'from-neutral-600 to-neutral-800' },
  { id: 'p8', name: 'Anker USB-C Multi-Hub', sku: 'TEC-HUB-05', price: 35.00, cost: 16.50, stock: 15, minStock: 4, category: 'Goods', color: 'from-orange-500 to-red-600' }
];

export const MACRO_PRESETS: MacroPreset[] = [
  {
    id: 'm1',
    title: 'Append Transaction Log',
    description: 'This VBA macro automatically finds the next empty row in your "Sales_Log" sheet and appends checkout data (Date, Transaction ID, Subtotal, Taxes, Discount, Total, and Payment Method) with professional auto-fit sizing.',
    category: 'sales',
    code: `Sub RecordTransaction(txID As String, subTotal As Double, taxAmt As Double, discAmt As Double, totalAmt As Double, payMethod As String)
    Dim ws As Worksheet
    Dim nextRow As Long
    
    ' Ensure Sales_Log sheet exists or create it
    On Error Resume Next
    Set ws = ThisWorkbook.Sheets("Sales_Log")
    On Error GoTo 0
    
    If ws Is Nothing Then
        Set ws = ThisWorkbook.Sheets.Add(After:=ThisWorkbook.Sheets(ThisWorkbook.Sheets.Count))
        ws.Name = "Sales_Log"
        ' Create headers with styles
        With ws.Range("A1:G1")
            .Value = Array("Timestamp", "Transaction ID", "Subtotal", "Tax", "Discount", "Total Revenue", "Payment Method")
            .Font.Bold = True
            .Font.Color = RGB(255, 255, 255)
            .Interior.Color = RGB(15, 23, 42) ' Modern Slate Gray Header
            .HorizontalAlignment = xlCenter
        End With
    End If
    
    ' Locate the next available row using column A
    nextRow = ws.Cells(ws.Rows.Count, "A").End(xlUp).Row + 1
    
    ' Populate values into cells
    ws.Cells(nextRow, 1).Value = Now
    ws.Cells(nextRow, 2).Value = txID
    ws.Cells(nextRow, 3).Value = subTotal
    ws.Cells(nextRow, 4).Value = taxAmt
    ws.Cells(nextRow, 5).Value = discAmt
    ws.Cells(nextRow, 6).Value = totalAmt
    ws.Cells(nextRow, 7).Value = payMethod
    
    ' Format cells to look neat
    ws.Cells(nextRow, 1).NumberFormat = "yyyy-mm-dd hh:mm:ss"
    ws.Range(ws.Cells(nextRow, 3), ws.Cells(nextRow, 6)).NumberFormat = "$#,##0.00"
    
    ' Auto-fit columns for crisp presentation
    ws.Columns("A:G").AutoFit
    
    MsgBox "Transaction " & txID & " logged successfully in Excel!", vbInformation, "Dremo Log Sync"
End Sub`,
    instructions: [
      'Open your Excel Workbook and press ALT + F11 to launch the VBA Developer workspace.',
      'Click Insert > Module to spawn a blank scripting sheet to hold the log macros.',
      'Paste the script directly into the workspace.',
      'To test: Save the file as an Excel Macro-Enabled Workbook (.xlsm) so the script is permanently bound.'
    ]
  },
  {
    id: 'm2',
    title: 'Inventory Alert & Stock Highlighter',
    description: 'Scans your "Inventory" sheet to check active stock limits. Instantly highlights rows in visual alarm colors (Red warning for critical levels, Yellow for light restocking concerns) and reports a quick message box summary.',
    category: 'inventory',
    code: `Sub ScanLowStockAlerts()
    Dim ws As Worksheet
    Dim lastRow As Long
    Dim i As Long
    Dim lowCount As Integer
    Dim productName As String
    Dim currStock As Long
    Dim minStock As Long
    
    Set ws = ActiveSheet
    lastRow = ws.Cells(ws.Rows.Count, "A").End(xlUp).Row
    lowCount = 0
    
    ' Loop through items skipping header
    For i = 2 To lastRow
        productName = ws.Cells(i, 2).Value ' Col B: Product Name
        currStock = Val(ws.Cells(i, 5).Value) ' Col E: Current Stock
        minStock = Val(ws.Cells(i, 6).Value) ' Col F: Minimum Safety Stock
        
        If currStock <= 0 Then
            ' CRITICAL OUT OF STOCK
            ws.Range("A" & i & ":G" & i).Interior.Color = RGB(254, 226, 226) ' Light Red
            ws.Range("E" & i).Font.Color = RGB(220, 38, 38)
            ws.Range("E" & i).Font.Bold = True
            lowCount = lowCount + 1
        ElseLight:
        If currStock <= minStock Then
            ' LOW STOCK WARNING
            ws.Range("A" & i & ":G" & i).Interior.Color = RGB(254, 243, 199) ' Light Amber
            ws.Range("E" & i).Font.Color = RGB(217, 119, 6)
            ws.Range("E" & i).Font.Bold = True
            lowCount = lowCount + 1
        Else
            ' HEALTHY STOCK RANGE - Restore clean backgrounds
            ws.Range("A" & i & ":G" & i).Interior.ColorIndex = xlNone
            ws.Range("E" & i).Font.ColorIndex = xlAutomatic
            ws.Range("E" & i).Font.Bold = False
        End If
    Next i
    
    ' Provide a neat status update to operator
    If lowCount > 0 Then
        MsgBox "Inventory Scan Complete!" & vbCrLf & _
               "Detected " & lowCount & " item(s) reaching levels below safety minimums." & vbCrLf & _
               "Please check the highlighted lines to initiate restocking.", vbExclamation, "Dremo Inventory Guardian"
    Else
        MsgBox "Excel inventory scans are complete. All stock levels are in healthy margins!", vbInformation, "Dremo Inventory Guardian"
    End If
End Sub`,
    instructions: [
      'In the Visual Basic Editor, place this code in a standard module.',
      'Make sure you have an active inventory list sheet with headers: SKU, Name, Description, Price, Current Stock, Min Stock.',
      'Assign this macro to an on-screen button shape for single-click diagnostic scanning.'
    ]
  },
  {
    id: 'm3',
    title: 'Daily Business Pivot Dashboard',
    description: 'This advanced macro automatically builds a gorgeous floating summary report on a separate dashboard sheet, creating an aggregated metrics summary (Cost of Goods Sold, gross revenue, net margins) and injecting a 3D bar chart representing payment methods.',
    category: 'reports',
    code: `Sub GenerateDailyAnalyticsDashboard()
    Dim wsSales As Worksheet
    Dim wsDash As Worksheet
    Dim rCount As Long
    Dim totalRev As Double
    Dim cashRev As Double
    Dim cardRev As Double
    Dim mobRev As Double
    Dim i As Long
    
    ' Find Sales Log
    On Error Resume Next
    Set wsSales = ThisWorkbook.Sheets("Sales_Log")
    On Error GoTo 0
    
    If wsSales Is Nothing Then
        MsgBox "Please populate some logs in 'Sales_Log' first!", vbCritical, "Reporting Error"
        Exit Sub
    End If
    
    ' Refresh or Create Dashboard Sheets
    On Error Resume Next
    Application.DisplayAlerts = False
    ThisWorkbook.Sheets("Dremo_Dashboard").Delete
    Application.DisplayAlerts = True
    On Error GoTo 0
    
    Set wsDash = ThisWorkbook.Sheets.Add(Before:=ThisWorkbook.Sheets(1))
    wsDash.Name = "Dremo_Dashboard"
    wsDash.Activate
    ActiveWindow.DisplayGridlines = True
    
    rCount = wsSales.Cells(wsSales.Rows.Count, "A").End(xlUp).Row
    totalRev = 0: cashRev = 0: cardRev = 0: mobRev = 0
    
    ' Accumulate statistics
    For i = 2 To rCount
        totalRev = totalRev + wsSales.Cells(i, 6).Value
        Select Case Trim(wsSales.Cells(i, 7).Value)
            Case "Cash"
                cashRev = cashRev + wsSales.Cells(i, 6).Value
            Case "Card"
                cardRev = cardRev + wsSales.Cells(i, 6).Value
            Case "Mobile Pay"
                mobRev = mobRev + wsSales.Cells(i, 6).Value
        End Select
    Next i
    
    ' Setup beautiful spreadsheet interface
    With wsDash
        ' Outer Border Accent
        .Range("B2:E9").Interior.Color = RGB(250, 250, 250)
        
        ' Title Banner
        .Range("B2:E2").Merge
        .Range("B2").Value = "DREMO POS - SALES ANALYTICS ENGINE"
        .Range("B2").Font.Name = "Segoe UI"
        .Range("B2").Font.Size = 14
        .Range("B2").Font.Bold = True
        .Range("B2").Font.Color = RGB(255, 255, 255)
        .Range("B2").Interior.Color = RGB(30, 41, 59) ' Dark Indigo Slate
        .Range("B2").HorizontalAlignment = xlCenter
        
        ' Label Columns
        .Range("B4").Value = "Key Metric": .Range("C4").Value = "Aggregate Value"
        .Range("B4:C4").Font.Bold = True
        .Range("B4:C4").Borders(xlEdgeBottom).LineStyle = xlContinuous
        
        ' Inject Summary Statistics
        .Range("B5").Value = "Gross Cumulative Sales"
        .Range("C5").Value = totalRev
        .Range("C5").NumberFormat = "$#,##0.00"
        
        .Range("B6").Value = "Cash Receipts Drawer"
        .Range("C6").Value = cashRev
        .Range("C6").NumberFormat = "$#,##0.00"
        
        .Range("B7").Value = "Card Processor Sales"
        .Range("C7").Value = cardRev
        .Range("C7").NumberFormat = "$#,##0.00"
        
        .Range("B8").Value = "Mobile Wallet Sales"
        .Range("C8").Value = mobRev
        .Range("C8").NumberFormat = "$#,##0.00"
        
        ' Auto width
        .Columns("B:E").AutoFit
    End With
    
    ' Add a modern payment breakdown chart to help visualize operations
    Dim chObject As ChartObject
    Dim chartRange As Range
    
    Set chartRange = wsDash.Range("B6:C8")
    Set chObject = wsDash.ChartObjects.Add(Left:=320, Top:=50, Width:=360, Height:=220)
    
    With chObject.Chart
        .SetSourceData Source:=chartRange
        .ChartType = xl3DBarClustered
        .HasTitle = True
        .ChartTitle.Text = "Revenue Streams by Payment Terminal"
        .HasLegend = False
    End With
    
    MsgBox "Daily Analytic Sheet generated. Interactive pivot tables and 3D graphs are now visible in the Dremo_Dashboard worksheet!", vbInformation, "Analytical Suite Activated"
End Sub`,
    instructions: [
      'Copy the VBA code block entirely.',
      'Paste it inside standard module sheets within Excel.',
      'Run the "GenerateDailyAnalyticsDashboard" macro to instantly create a beautiful graphical dashboard that updates using your sales record lines.'
    ]
  }
];
