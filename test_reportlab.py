#!/usr/bin/env python3
"""
Test script to verify ReportLab installation and functionality
"""

def test_reportlab_import():
    """Test if ReportLab can be imported"""
    try:
        from reportlab.lib.pagesizes import A4
        from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
        from reportlab.lib.styles import getSampleStyleSheet
        from reportlab.lib.units import inch
        print("✅ ReportLab import successful!")
        return True
    except ImportError as e:
        print(f"❌ ReportLab import failed: {e}")
        return False

def test_pdf_generation():
    """Test basic PDF generation"""
    try:
        from reportlab.lib.pagesizes import A4
        from reportlab.platypus import SimpleDocTemplate, Paragraph
        from reportlab.lib.styles import getSampleStyleSheet
        import io
        
        # Create PDF in memory
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=A4)
        styles = getSampleStyleSheet()
        
        # Create content
        story = []
        story.append(Paragraph("ReportLab Test Document", styles['Title']))
        story.append(Paragraph("This is a test to verify ReportLab is working correctly.", styles['Normal']))
        
        # Build PDF
        doc.build(story)
        buffer.seek(0)
        
        pdf_size = len(buffer.getvalue())
        print(f"✅ PDF generation successful! Size: {pdf_size} bytes")
        return True
        
    except Exception as e:
        print(f"❌ PDF generation failed: {e}")
        return False

def main():
    """Run all tests"""
    print("🔍 Testing ReportLab Installation...")
    print("=" * 50)
    
    # Test 1: Import
    import_success = test_reportlab_import()
    
    # Test 2: PDF Generation
    if import_success:
        pdf_success = test_pdf_generation()
    else:
        pdf_success = False
    
    # Summary
    print("\n" + "=" * 50)
    print("📊 Test Results:")
    print(f"Import Test: {'✅ PASS' if import_success else '❌ FAIL'}")
    print(f"PDF Generation Test: {'✅ PASS' if pdf_success else '❌ FAIL'}")
    
    if import_success and pdf_success:
        print("\n🎉 ReportLab is fully functional!")
        print("✅ Sample Card PDF generation should work properly")
    else:
        print("\n⚠️  ReportLab has issues")
        print("🔄 System will use HTML fallback for Sample Cards")
    
    return import_success and pdf_success

if __name__ == "__main__":
    main()
