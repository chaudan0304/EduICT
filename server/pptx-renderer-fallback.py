import os
import sys
import json
import argparse
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

def render_pdf_to_images(pdf_path, output_dir, dpi=150):
    """
    Chuyển đổi toàn bộ các trang của file PDF thành ảnh PNG chuẩn (slide_01.png, slide_02.png,...)
    """
    if not os.path.isfile(pdf_path):
        return {
            "success": False,
            "error": f"File PDF không tồn tại: {pdf_path}"
        }

    os.makedirs(output_dir, exist_ok=True)

    try:
        try:
            import pymupdf as fitz
        except ImportError:
            import fitz

        doc = fitz.open(pdf_path)
        page_count = len(doc)
        if page_count == 0:
            doc.close()
            return {
                "success": False,
                "error": "File PDF không chứa trang nào."
            }

        slides = []
        has_failed = False
        zoom = dpi / 72.0
        mat = fitz.Matrix(zoom, zoom)

        for i in range(page_count):
            slide_num = i + 1
            filename = f"slide_{slide_num:02d}.png"
            out_img_path = os.path.join(output_dir, filename)

            try:
                page = doc.load_page(i)
                pix = page.get_pixmap(matrix=mat, alpha=False)
                pix.save(out_img_path)

                size_bytes = os.path.getsize(out_img_path) if os.path.isfile(out_img_path) else 0

                if size_bytes > 1024 and pix.width > 0 and pix.height > 0:
                    slides.append({
                        "index": i,
                        "slideNumber": slide_num,
                        "fileName": filename,
                        "filePath": os.path.abspath(out_img_path),
                        "title": f"Slide {slide_num}",
                        "sizeBytes": size_bytes,
                        "width": pix.width,
                        "height": pix.height,
                        "status": "completed"
                    })
                else:
                    has_failed = True
                    slides.append({
                        "index": i,
                        "slideNumber": slide_num,
                        "fileName": filename,
                        "filePath": os.path.abspath(out_img_path),
                        "title": f"Slide {slide_num}",
                        "sizeBytes": size_bytes,
                        "status": "failed",
                        "error": "Ảnh kết xuất có kích thước 0 byte hoặc < 1KB"
                    })
            except Exception as page_err:
                has_failed = True
                slides.append({
                    "index": i,
                    "slideNumber": slide_num,
                    "fileName": filename,
                    "title": f"Slide {slide_num}",
                    "sizeBytes": 0,
                    "status": "failed",
                    "error": str(page_err)
                })

        doc.close()

        return {
            "success": len([s for s in slides if s["status"] == "completed"]) > 0,
            "pageCount": page_count,
            "slideCount": page_count,
            "slides": slides,
            "hasFailedSlide": has_failed,
            "error": "" if not has_failed else "Một số slide gặp lỗi khi kết xuất từ PDF"
        }

    except Exception as e:
        return {
            "success": False,
            "error": f"Lỗi xử lý PDF qua PyMuPDF: {str(e)}"
        }

def render_single_pdf_page(pdf_path, page_num, output_file, dpi=150):
    """
    Chuyển đổi 1 trang đơn lẻ từ PDF sang file ảnh (phục vụ retry)
    page_num: 1-indexed (ví dụ slide 7 thì page_num = 7)
    """
    if not os.path.isfile(pdf_path):
        return {
            "success": False,
            "error": f"File PDF không tồn tại: {pdf_path}"
        }

    parent_dir = os.path.dirname(os.path.abspath(output_file))
    os.makedirs(parent_dir, exist_ok=True)

    try:
        try:
            import pymupdf as fitz
        except ImportError:
            import fitz

        doc = fitz.open(pdf_path)
        total_pages = len(doc)
        if page_num < 1 or page_num > total_pages:
            doc.close()
            return {
                "success": False,
                "error": f"Số trang {page_num} không hợp lệ. Tổng số trang PDF là {total_pages}"
            }

        zoom = dpi / 72.0
        mat = fitz.Matrix(zoom, zoom)
        page = doc.load_page(page_num - 1)
        pix = page.get_pixmap(matrix=mat, alpha=False)
        pix.save(output_file)
        doc.close()

        size_bytes = os.path.getsize(output_file) if os.path.isfile(output_file) else 0
        if size_bytes > 1024 and pix.width > 0 and pix.height > 0:
            return {
                "success": True,
                "slideNumber": page_num,
                "fileName": os.path.basename(output_file),
                "filePath": os.path.abspath(output_file),
                "sizeBytes": size_bytes,
                "width": pix.width,
                "height": pix.height,
                "status": "completed"
            }
        else:
            return {
                "success": False,
                "slideNumber": page_num,
                "error": "Ảnh kết xuất có kích thước <= 1024 bytes hoặc chiều rộng/cao không hợp lệ"
            }

    except Exception as e:
        return {
            "success": False,
            "slideNumber": page_num,
            "error": f"Lỗi render trang PDF {page_num}: {str(e)}"
        }

def convert_pptx_with_libreoffice(pptx_path, output_dir):
    soffice_path = find_libreoffice()
    if not soffice_path:
        return {
            "success": False,
            "error": "Không tìm thấy LibreOffice (soffice.exe) trên máy chủ."
        }
    
    os.makedirs(output_dir, exist_ok=True)
    temp_pdf_dir = os.path.join(output_dir, "_temp_pdf")
    os.makedirs(temp_pdf_dir, exist_ok=True)
    
    try:
        cmd = [
            soffice_path,
            "--headless",
            "--convert-to", "pdf",
            "--outdir", temp_pdf_dir,
            pptx_path
        ]
        
        proc = subprocess.run(cmd, capture_output=True, text=True, timeout=60)
        if proc.returncode != 0:
            shutil.rmtree(temp_pdf_dir, ignore_errors=True)
            return {
                "success": False,
                "error": f"LibreOffice gặp lỗi: {proc.stderr or proc.stdout}"
            }
            
        base_name = Path(pptx_path).stem
        pdf_file = os.path.join(temp_pdf_dir, f"{base_name}.pdf")
        if not os.path.isfile(pdf_file):
            pdfs = glob.glob(os.path.join(temp_pdf_dir, "*.pdf"))
            if pdfs:
                pdf_file = pdfs[0]
            else:
                shutil.rmtree(temp_pdf_dir, ignore_errors=True)
                return {
                    "success": False,
                    "error": "Không tìm thấy file PDF sau khi LibreOffice xử lý."
                }
                
        # Dùng hàm render_pdf_to_images đã tối ưu
        result = render_pdf_to_images(pdf_file, output_dir)
        
        # Cleanup temp pdf
        shutil.rmtree(temp_pdf_dir, ignore_errors=True)
        return result

    except Exception as e:
        shutil.rmtree(temp_pdf_dir, ignore_errors=True)
        return {
            "success": False,
            "error": f"Lỗi LibreOffice fallback: {str(e)}"
        }

def main():
    parser = argparse.ArgumentParser(description="EduICT PPTX / PDF Slide Renderer")
    parser.add_argument("--mode", choices=["pdf_all", "pdf_single", "pptx_libreoffice", "legacy"], default="legacy")
    parser.add_argument("--input", help="Đường dẫn file đầu vào (.pptx hoặc .pdf)")
    parser.add_argument("--output-dir", help="Thư mục xuất ảnh")
    parser.add_argument("--output-file", help="File xuất ảnh đơn lẻ")
    parser.add_argument("--page", type=int, default=1, help="Số trang (1-indexed) khi dùng pdf_single")
    parser.add_argument("--dpi", type=int, default=150, help="DPI kết xuất ảnh")
    
    # Hỗ trợ cú pháp positional cũ: script.py <input> <output_dir>
    parser.add_argument("pos_input", nargs="?", help="Positional input")
    parser.add_argument("pos_output", nargs="?", help="Positional output")

    args = parser.parse_args()

    input_path = args.input or args.pos_input
    output_dir = args.output_dir or args.pos_output
    output_file = args.output_file

    if not input_path:
        print(json.dumps({"success": False, "error": "Thiếu tham số đầu vào"}, ensure_ascii=False))
        sys.exit(1)

    input_path = os.path.abspath(input_path)

    if args.mode == "pdf_all":
        if not output_dir:
            print(json.dumps({"success": False, "error": "Thiếu --output-dir cho chế độ pdf_all"}, ensure_ascii=False))
            sys.exit(1)
        res = render_pdf_to_images(input_path, os.path.abspath(output_dir), dpi=args.dpi)
        print(json.dumps(res, ensure_ascii=False))

    elif args.mode == "pdf_single":
        if not output_file:
            print(json.dumps({"success": False, "error": "Thiếu --output-file cho chế độ pdf_single"}, ensure_ascii=False))
            sys.exit(1)
        res = render_single_pdf_page(input_path, args.page, os.path.abspath(output_file), dpi=args.dpi)
        print(json.dumps(res, ensure_ascii=False))

    elif args.mode == "pptx_libreoffice":
        if not output_dir:
            print(json.dumps({"success": False, "error": "Thiếu output_dir"}, ensure_ascii=False))
            sys.exit(1)
        res = convert_pptx_with_libreoffice(input_path, os.path.abspath(output_dir))
        print(json.dumps(res, ensure_ascii=False))

    else:
        # Legacy fallback
        if input_path.lower().endswith(".pdf"):
            res = render_pdf_to_images(input_path, os.path.abspath(output_dir), dpi=args.dpi)
        else:
            res = convert_pptx_with_libreoffice(input_path, os.path.abspath(output_dir))
        print(json.dumps(res, ensure_ascii=False))

if __name__ == "__main__":
    main()
