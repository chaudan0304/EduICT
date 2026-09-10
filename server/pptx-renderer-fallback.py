import os
import sys
import json
import subprocess
import shutil
import glob
from pathlib import Path

def find_libreoffice():
    # 1. Check in PATH
    for cmd in ['soffice', 'libreoffice']:
        found = shutil.which(cmd)
        if found:
            return found
    
    # 2. Check standard Windows paths
    possible_paths = [
        r"C:\Program Files\LibreOffice\program\soffice.exe",
        r"C:\Program Files (x86)\LibreOffice\program\soffice.exe",
        r"C:\ProgramData\chocolatey\bin\soffice.exe",
        r"D:\Program Files\LibreOffice\program\soffice.exe"
    ]
    for p in possible_paths:
        if os.path.isfile(p):
            return p
            
    # 3. Check Linux/Mac paths
    for p in ["/usr/bin/soffice", "/usr/bin/libreoffice", "/Applications/LibreOffice.app/Contents/MacOS/soffice"]:
        if os.path.isfile(p):
            return p
            
    return None

def convert_pptx_with_libreoffice(pptx_path, output_dir):
    soffice_path = find_libreoffice()
    if not soffice_path:
        return {
            "success": False,
            "error": "Không tìm thấy LibreOffice (soffice.exe) trên máy chủ. Vui lòng cài đặt LibreOffice hoặc Microsoft Office."
        }
    
    os.makedirs(output_dir, exist_ok=True)
    temp_pdf_dir = os.path.join(output_dir, "_temp_pdf")
    os.makedirs(temp_pdf_dir, exist_ok=True)
    
    try:
        # Convert PPTX to PDF using LibreOffice headless
        cmd = [
            soffice_path,
            "--headless",
            "--convert-to", "pdf",
            "--outdir", temp_pdf_dir,
            pptx_path
        ]
        
        proc = subprocess.run(cmd, capture_output=True, text=True, timeout=60)
        if proc.returncode != 0:
            return {
                "success": False,
                "error": f"LibreOffice gặp lỗi khi chuyển đổi PPTX sang PDF: {proc.stderr or proc.stdout}"
            }
            
        # Find converted PDF
        base_name = Path(pptx_path).stem
        pdf_file = os.path.join(temp_pdf_dir, f"{base_name}.pdf")
        if not os.path.isfile(pdf_file):
            pdfs = glob.glob(os.path.join(temp_pdf_dir, "*.pdf"))
            if pdfs:
                pdf_file = pdfs[0]
            else:
                return {
                    "success": False,
                    "error": "Không tìm thấy file PDF sau khi LibreOffice xử lý."
                }
                
        # Use PyMuPDF (fitz) to convert PDF pages to PNGs
        import fitz
        
        doc = fitz.open(pdf_file)
        slide_count = len(doc)
        slides = []
        
        for i in range(slide_count):
            page = doc.load_page(i)
            # Render at 150 DPI for crisp slides (16:9)
            zoom = 150 / 72.0
            mat = fitz.Matrix(zoom, zoom)
            pix = page.get_pixmap(matrix=mat, alpha=False)
            
            slide_filename = f"Slide{i + 1}.PNG"
            out_img_path = os.path.join(output_dir, slide_filename)
            pix.save(out_img_path)
            
            file_size = os.path.getsize(out_img_path) if os.path.isfile(out_img_path) else 0
            slides.append({
                "index": i,
                "fileName": slide_filename,
                "title": f"Slide {i + 1}",
                "sizeBytes": file_size
            })
            
        doc.close()
        
        # Cleanup temp pdf
        shutil.rmtree(temp_pdf_dir, ignore_errors=True)
        
        return {
            "success": True,
            "slideCount": slide_count,
            "slides": slides,
            "error": ""
        }
    except Exception as e:
        shutil.rmtree(temp_pdf_dir, ignore_errors=True)
        return {
            "success": False,
            "error": f"Lỗi khi render slide từ PDF: {str(e)}"
        }

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print(json.dumps({"success": False, "error": "Thiếu tham số: pptx_path và output_dir"}))
        sys.exit(1)
        
    pptx_path = os.path.abspath(sys.argv[1])
    output_dir = os.path.abspath(sys.argv[2])
    
    result = convert_pptx_with_libreoffice(pptx_path, output_dir)
    print(json.dumps(result, ensure_ascii=False))
