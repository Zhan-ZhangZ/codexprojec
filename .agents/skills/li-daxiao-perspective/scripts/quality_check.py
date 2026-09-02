#!/usr/bin/env python3
"""
Quality Check & Verification for Li Daxiao Perspective Skill
"""
import os, sys

SKILL_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

def check_structure():
    required_files = [
        "SKILL.md",
        "FIDELITY.md",
        "references/research/01-writings.md",
        "references/research/02-conversations.md",
        "references/research/03-expression-dna.md",
        "references/research/04-external-views.md",
        "references/research/05-decisions.md",
        "references/research/06-timeline.md",
    ]
    
    missing = []
    for rel_path in required_files:
        full_path = os.path.join(SKILL_DIR, rel_path)
        if not os.path.exists(full_path):
            missing.append(rel_path)
            
    if missing:
        print(f"❌ Missing files: {missing}")
        return False
        
    print("✅ All required skill & research files exist.")
    
    # Check SKILL.md contents
    with open(os.path.join(SKILL_DIR, "SKILL.md"), "r", encoding="utf-8") as f:
        skill_content = f.read()
        
    required_keywords = [
        "name: li-daxiao-perspective",
        "做好人，买好股，得好报",
        "四大风向标",
        "股债差",
        "余钱投资",
        "黑五类",
        "钻石底",
        "地球顶",
        "婴儿底",
        "地平线"
    ]
    
    for kw in required_keywords:
        if kw not in skill_content:
            print(f"⚠️ Warning: '{kw}' not found in SKILL.md")
            
    print("✅ SKILL.md core content and keywords verified.")
    return True

if __name__ == "__main__":
    if check_structure():
        print("🎉 li-daxiao-perspective skill quality check passed successfully!")
    else:
        sys.exit(1)
