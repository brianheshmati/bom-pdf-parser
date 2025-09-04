Option Explicit

' ======= CONFIG =======
Private Const SHEET_BOM As String = "BOM"
Private Const SHEET_COATINGS As String = "Coatings Order Form"

Private Const BOM_EXPORT_RANGE As String = "A1:M100"     ' adjust if needed
Private Const COATINGS_EXPORT_RANGE As String = "A1:Y56" ' per request

Private Const FINAL_PREFIX As String = "Final BOM "
Private Const ARCHIVE_FOLDER As String = "archive"
' ======================

' ========== PUBLIC ENTRYPOINT (assign your single button to this) ==========
Public Sub BuildFinalBOM_Click()
    Dim wb As Workbook: Set wb = ThisWorkbook
    Dim wsBOM As Worksheet, wsCOF As Worksheet
    Dim outDir As String, finalPDF As String, logPath As String
    Dim pdfBOM As String, pdfCOF As String
    Dim pdfEng As String, pdfYard As String
    Dim fso As Object: Set fso = CreateObject("Scripting.FileSystemObject")
    Dim cmd As String, pdftkExe As String, waitCmd As String
    Dim exitCode As Long
    Dim fPath, oneDrivePath, destPath, curDir As String

    If Len(wb.Path) = 0 Then
        MsgBox "Please save the workbook before running.", vbExclamation
        Exit Sub
    End If
    outDir = wb.Path

    ' Sheets
    On Error Resume Next
    Set wsBOM = wb.Sheets(SHEET_BOM)
    Set wsCOF = wb.Sheets(SHEET_COATINGS)
    On Error GoTo 0
    If wsBOM Is Nothing Then MsgBox "Sheet not found: " & SHEET_BOM, vbCritical: Exit Sub
    If wsCOF Is Nothing Then MsgBox "Sheet not found: " & SHEET_COATINGS, vbCritical: Exit Sub

    fPath = ThisWorkbook.FullName
    
    fPath = Replace$(Mid$(fPath, InStr(InStr(InStr(fPath, "//") + 2, fPath, "/") + 1, fPath, "/") + 1, InStrRev(fPath, "/") - InStr(InStr(InStr(fPath, "//") + 2, fPath, "/") + 1, fPath, "/") - 1), "/", "\")
    curDir = Environ("OneDrive") & "\" & fPath
    
    ' Pick Engineering and Yard PDFs (supports OneDrive/shared/UNC paths)
    pdfEng = PickOnePdf("Select Engineering BOM PDF")
    
    
    
    
    If Len(pdfEng) = 0 Then Exit Sub
    pdfYard = PickOnePdf("Select Yard Piping BOM PDF")
    If Len(pdfYard) = 0 Then Exit Sub

    ' Name check (require different file names)
    If LCase$(Dir$(pdfEng)) = LCase$(Dir$(pdfYard)) Then
        MsgBox "Engineering and Yard PDFs cannot have the same file name." & vbCrLf & _
               "Please pick two different files.", vbExclamation
        Exit Sub
    End If

    ' Existence checks
    If Not fso.FileExists(pdfEng) Then
        MsgBox "Engineering file not found:" & vbCrLf & pdfEng, vbExclamation: Exit Sub
    End If
    If Not fso.FileExists(pdfYard) Then
        MsgBox "Yard file not found:" & vbCrLf & pdfYard, vbExclamation: Exit Sub
    End If

    ' Archive any old finals before creating a new one
    ArchiveExistingFinals outDir
      
    ' Temp export paths
    pdfBOM = curDir & "\~tmp_BOM.pdf"
    pdfCOF = curDir & "\~tmp_Coatings.pdf"

    ' 1) Export BOM range -> portrait, width=1 page, multi-page tall
    ExportRangePdf_PortraitMulti wsBOM, wsBOM.Range(BOM_EXPORT_RANGE), pdfBOM

    ' 2) Export Coatings range -> landscape, 1 page (1x1)
    ExportRangePdf_LandscapeOnePage wsCOF, wsCOF.Range(COATINGS_EXPORT_RANGE), pdfCOF

    ' 3) Final paths
    finalPDF = curDir & "\" & FINAL_PREFIX & Format(Now, "yyyymmdd_hhmm") & ".pdf"
    logPath = curDir & "\pdftk_merge.log"

    ' 4) Find PDFtk (PATH or common install locations)
    pdftkExe = "pdftk" 'FindPdfTk()
    If Len(pdftkExe) = 0 Then
        MsgBox "PDFtk not found. Install PDFtk Server or add it to PATH.", vbCritical
        Exit Sub
    End If

    ' 5) Merge synchronously: BOM -> Coatings -> Engineering -> Yard
   
    cmd = "pdftk """ & pdfBOM & """ """ & pdfCOF & """ """ & pdfEng & """ """ & pdfYard & """ cat output """ & finalPDF & """"
    exitCode = RunAndWait(cmd)
    Debug.Print cmd
    
    
    ' 6) Validate result
    If Dir$(finalPDF) = "" Or exitCode <> 0 Then
        Dim msg As String
        msg = "Final PDF was not created." & vbCrLf & _
              "Exit code: " & exitCode & vbCrLf & _
              "See log for details:" & vbCrLf & logPath
        MsgBox msg, vbCritical
        ' keep temp PDFs for troubleshooting
        Exit Sub
    End If

    ' 7) Cleanup temps ONLY after success
    On Error Resume Next
    fso.DeleteFile pdfBOM, True
    fso.DeleteFile pdfCOF, True
    On Error GoTo 0

    MsgBox "Merged PDF created:" & vbCrLf & finalPDF, vbInformation
End Sub
' ==========================================================================


' ---------------------- EXPORT HELPERS ----------------------

' Export a range: Portrait, Fit width=1 page, height = auto (multi-page)
Private Sub ExportRangePdf_PortraitMulti(ByVal ws As Worksheet, ByVal rng As Range, ByVal outPath As String)
    Dim oldPrintArea As String, oldOrientation As XlPageOrientation
    Dim oldZoom As Variant, oldFitW As Variant, oldFitH As Variant
    Dim oldCH As Boolean, oldCV As Boolean

    With ws.PageSetup
        oldPrintArea = .PrintArea
        oldOrientation = .Orientation
        oldZoom = .Zoom
        oldFitW = .FitToPagesWide
        oldFitH = .FitToPagesTall
        oldCH = .CenterHorizontally
        oldCV = .CenterVertically
    End With

    On Error Resume Next: Application.PrintCommunication = False: On Error GoTo 0
    With ws.PageSetup
        .PrintArea = rng.Address(True, True)
        .Orientation = xlPortrait
        .CenterHorizontally = True
        .CenterVertically = False
        .Zoom = False
        .FitToPagesWide = 1
        .FitToPagesTall = False
        .LeftMargin = Application.InchesToPoints(0.5)
        .RightMargin = Application.InchesToPoints(0.5)
        .TopMargin = Application.InchesToPoints(0.5)
        .BottomMargin = Application.InchesToPoints(0.5)
        .HeaderMargin = Application.InchesToPoints(0.3)
        .FooterMargin = Application.InchesToPoints(0.3)
    End With
    On Error Resume Next: Application.PrintCommunication = True: On Error GoTo 0

    rng.ExportAsFixedFormat Type:=xlTypePDF, Filename:=outPath, _
                            Quality:=xlQualityStandard, IncludeDocProperties:=True, _
                            IgnorePrintAreas:=False, OpenAfterPublish:=False

    On Error Resume Next
    With ws.PageSetup
        .PrintArea = oldPrintArea
        .Orientation = oldOrientation
        .Zoom = oldZoom
        .FitToPagesWide = oldFitW
        .FitToPagesTall = oldFitH
        .CenterHorizontally = oldCH
        .CenterVertically = oldCV
    End With
    On Error GoTo 0
End Sub

' Export a range: Landscape, force exactly 1 page (1x1)
Private Sub ExportRangePdf_LandscapeOnePage(ByVal ws As Worksheet, ByVal rng As Range, ByVal outPath As String)
    Dim oldPrintArea As String, oldOrientation As XlPageOrientation
    Dim oldZoom As Variant, oldFitW As Variant, oldFitH As Variant
    Dim oldCH As Boolean, oldCV As Boolean

    With ws.PageSetup
        oldPrintArea = .PrintArea
        oldOrientation = .Orientation
        oldZoom = .Zoom
        oldFitW = .FitToPagesWide
        oldFitH = .FitToPagesTall
        oldCH = .CenterHorizontally
        oldCV = .CenterVertically
    End With

    On Error Resume Next: Application.PrintCommunication = False: On Error GoTo 0
    With ws.PageSetup
        .PrintArea = rng.Address(True, True)
        .Orientation = xlLandscape
        .CenterHorizontally = True
        .CenterVertically = True
        .Zoom = False
        .FitToPagesWide = 1
        .FitToPagesTall = 1
        .LeftMargin = Application.InchesToPoints(0.4)
        .RightMargin = Application.InchesToPoints(0.4)
        .TopMargin = Application.InchesToPoints(0.4)
        .BottomMargin = Application.InchesToPoints(0.4)
        .HeaderMargin = Application.InchesToPoints(0.3)
        .FooterMargin = Application.InchesToPoints(0.3)
    End With
    On Error Resume Next: Application.PrintCommunication = True: On Error GoTo 0

    rng.ExportAsFixedFormat Type:=xlTypePDF, Filename:=outPath, _
                            Quality:=xlQualityStandard, IncludeDocProperties:=True, _
                            IgnorePrintAreas:=False, OpenAfterPublish:=False

    On Error Resume Next
    With ws.PageSetup
        .PrintArea = oldPrintArea
        .Orientation = oldOrientation
        .Zoom = oldZoom
        .FitToPagesWide = oldFitW
        .FitToPagesTall = oldFitH
        .CenterHorizontally = oldCH
        .CenterVertically = oldCV
    End With
    On Error GoTo 0
End Sub


' ---------------------- ARCHIVE HELPERS ----------------------

' Move existing "Final BOM *.pdf" to /archive (create if missing)
Private Sub ArchiveExistingFinals(ByVal outDir As String)
    Dim fso As Object: Set fso = CreateObject("Scripting.FileSystemObject")
    Dim arch As String: arch = outDir & "\" & ARCHIVE_FOLDER
    Dim fld As Object, file As Object
    Dim fPath, oneDrivePath, destPath As String
      
    fPath = ThisWorkbook.FullName
    
    fPath = Replace$(Mid$(fPath, InStr(InStr(InStr(fPath, "//") + 2, fPath, "/") + 1, fPath, "/") + 1, InStrRev(fPath, "/") - InStr(InStr(InStr(fPath, "//") + 2, fPath, "/") + 1, fPath, "/") - 1), "/", "\")

    'Debug.Print CleanFolder1L(fPath)
    
    arch = Environ("OneDrive") & "\" & fPath & "\" & ARCHIVE_FOLDER
    
    If Not fso.FolderExists(arch) Then fso.CreateFolder arch
  
    Set fld = fso.GetFolder(Environ("OneDrive") & "\" & fPath)

    For Each file In fld.Files
        If LCase$(Right$(file.Name, 4)) = ".pdf" Then
            If LCase$(Left$(file.Name, Len(FINAL_PREFIX))) = LCase$(FINAL_PREFIX) Then
                On Error Resume Next
                destPath = fso.BuildPath(arch, file.Name)
                
                ' If file already exists in archive, delete it first
                If fso.FileExists(destPath) Then fso.DeleteFile destPath, True
                
                file.Move destPath
                On Error GoTo 0
            End If
        End If
    Next
End Sub

' ---------------------- PDFTK INVOCATION (SYNC + LOG) ----------------------

' Run a command synchronously and return exit code
Private Function RunAndWait(ByVal fullCmd As String) As Long
    Dim sh As Object
    Set sh = CreateObject("WScript.Shell")
    Debug.Print fullCmd
    ' 0 = hidden window; True = wait for completion
    RunAndWait = sh.Run(fullCmd, 1, True)
End Function

' Try to locate pdftk.exe via PATH or common install folders
Private Function FindPdfTk() As String
    Dim sh As Object, execObj As Object, line As String
    On Error Resume Next

    ' Try PATH using WHERE
    Set sh = CreateObject("WScript.Shell")
    Set execObj = sh.Exec("cmd /c where pdftk")
    Do While Not execObj Is Nothing And Not execObj.StdOut.AtEndOfStream
        line = Trim$(execObj.StdOut.ReadLine)
        If Len(line) > 0 And LCase$(Right$(line, 4)) = ".exe" Then
            FindPdfTk = line
            Exit Function
        End If
    Loop

    ' Fallback: common install locations
    Dim candidates As Variant, i As Long
    candidates = Array( _
        "C:\Program Files (x86)\PDFtk Server\bin\pdftk.exe", _
        "C:\Program Files\PDFtk Server\bin\pdftk.exe", _
        Environ$("ProgramFiles") & "\PDFtk Server\bin\pdftk.exe", _
        Environ$("ProgramFiles(x86)") & "\PDFtk Server\bin\pdftk.exe" _
    )
    For i = LBound(candidates) To UBound(candidates)
        If Len(Dir$(candidates(i))) > 0 Then
            FindPdfTk = candidates(i)
            Exit Function
        End If
    Next i
End Function

' Build a robust command that logs stdout/stderr to a file and waits
Private Function BuildPdfTkCmdWait(ByVal pdftkExe As String, ByVal inputs As Variant, ByVal outPath As String, ByVal logPath As String) As String
    Dim i As Long, part As String, q As String
    q = Chr$(34)
    For i = LBound(inputs) To UBound(inputs)
        part = part & q & CStr(inputs(i)) & q & " "
    Next i
    ' Use cmd.exe to capture output. 1> log (stdout), 2>&1 (stderr to stdout)
    BuildPdfTkCmdWait = pdftkExe & q & " " & part & "cat output " & q & outPath & q & " 1> " & q & logPath & q & " 2>&1" ' "cmd /c " & q & pdftkExe & q & " " & part & "cat output " & q & outPath & q & " 1> " & q & logPath & q & " 2>&1"
End Function

' ---------------------- UI PICKER ----------------------

' Single PDF picker
Private Function PickOnePdf(ByVal titleText As String) As String
    Dim fd As FileDialog
    Set fd = Application.FileDialog(msoFileDialogFilePicker)
    With fd
        .Title = titleText
        .AllowMultiSelect = False
        .Filters.Clear
        .Filters.Add "PDF files", "*.pdf"
        If .Show <> -1 Then Exit Function
        PickOnePdf = .SelectedItems(1)
    End With
End Function


