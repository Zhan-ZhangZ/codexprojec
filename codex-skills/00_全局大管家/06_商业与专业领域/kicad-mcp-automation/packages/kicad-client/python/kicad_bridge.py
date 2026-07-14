#!/usr/bin/env python3
"""
KiCad File Generator Bridge
Generates real KiCad files using kiutils library
"""

import sys
import json
from pathlib import Path

try:
    from kiutils.board import Board
    from kiutils.schematic import Schematic
    from kiutils.footprint import Footprint
    from kiutils.items.common import Position, Property
    from kiutils.items.brditems import Via, Segment, Arc
    from kiutils.items.fpitems import FpText
except ImportError:
    print(json.dumps({
        "error": "kiutils not installed. Run: pip install kiutils",
        "success": False
    }))
    sys.exit(1)


def create_project(name: str, path: str, layers: int = 2, board_width: float = 100.0, board_height: float = 80.0):
    """Create a new KiCad project with .kicad_pro, .kicad_sch, and .kicad_pcb files"""
    try:
        project_dir = Path(path)
        project_dir.mkdir(parents=True, exist_ok=True)

        # Create project file (.kicad_pro) - minimal JSON structure
        project_data = {
            "board": {
                "design_settings": {
                    "defaults": {
                        "board_outline_line_width": 0.1,
                        "copper_line_width": 0.2
                    }
                }
            },
            "schematic": {
                "drawing": {
                    "default_line_thickness": 6.0,
                    "default_text_size": 50.0
                }
            },
            "meta": {
                "version": 1
            }
        }

        project_file = project_dir / f"{name}.kicad_pro"
        with open(project_file, 'w') as f:
            json.dump(project_data, f, indent=2)

        # Create schematic file (.kicad_sch)
        schematic = Schematic.create_new()
        schematic.to_file(str(project_dir / f"{name}.kicad_sch"))

        # Create PCB file (.kicad_pcb)
        board = Board.create_new()

        # Set board properties
        if hasattr(board, 'general') and board.general:
            board.general.thickness = 1.6  # Standard 1.6mm PCB thickness

        # Store layer count in board setup
        if not hasattr(board, 'setup') or board.setup is None:
            from kiutils.items.common import Setup
            board.setup = Setup()

        # Save board file
        board.to_file(str(project_dir / f"{name}.kicad_pcb"))

        return {
            "success": True,
            "projectPath": str(project_dir / name),
            "files": {
                "project": str(project_file),
                "schematic": str(project_dir / f"{name}.kicad_sch"),
                "pcb": str(project_dir / f"{name}.kicad_pcb")
            },
            "message": f"Project '{name}' created successfully with real KiCad files"
        }

    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "message": f"Failed to create project: {str(e)}"
        }


def add_component(pcb_path: str, value: str, footprint: str, x: float, y: float, rotation: float = 0, layer: str = "front"):
    """Add a component to an existing PCB"""
    try:
        # Load existing board
        board = Board.from_file(pcb_path)

        # Create footprint (we'll use a basic SMD footprint as template)
        # In real use, footprints would be loaded from KiCad libraries
        fp = Footprint()
        fp.entryName = footprint
        fp.layer = "F.Cu" if layer == "front" else "B.Cu"
        fp.position = Position(X=x, Y=y, angle=rotation)

        # Generate reference designator
        existing_refs = [f.reference for f in board.footprints if hasattr(f, 'reference')]
        ref_prefix = value[0].upper() if value else 'U'
        ref_num = 1
        while f"{ref_prefix}{ref_num}" in existing_refs:
            ref_num += 1
        reference = f"{ref_prefix}{ref_num}"

        # Add reference and value text
        ref_text = FpText(type='reference', text=reference)
        ref_text.position = Position(X=0, Y=-2)
        ref_text.layer = "F.SilkS" if layer == "front" else "B.SilkS"
        fp.graphicItems.append(ref_text)

        val_text = FpText(type='value', text=value)
        val_text.position = Position(X=0, Y=2)
        val_text.layer = "F.Fab" if layer == "front" else "B.Fab"
        fp.graphicItems.append(val_text)

        # Add footprint to board
        board.footprints.append(fp)

        # Save board
        board.to_file(pcb_path)

        return {
            "success": True,
            "component": {
                "reference": reference,
                "value": value,
                "footprint": footprint,
                "position": {"x": x, "y": y},
                "rotation": rotation,
                "layer": layer
            },
            "message": f"Added component {reference} to PCB"
        }

    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "message": f"Failed to add component: {str(e)}"
        }


def get_components(pcb_path: str):
    """Get all components from a PCB"""
    try:
        board = Board.from_file(pcb_path)

        components = []
        for fp in board.footprints:
            # Extract reference and value from graphic items
            reference = "?"
            value = ""

            for item in fp.graphicItems:
                if isinstance(item, FpText):
                    if item.type == 'reference':
                        reference = item.text
                    elif item.type == 'value':
                        value = item.text

            components.append({
                "reference": reference,
                "value": value,
                "footprint": fp.entryName if hasattr(fp, 'entryName') else "unknown",
                "position": {
                    "x": fp.position.X if fp.position else 0,
                    "y": fp.position.Y if fp.position else 0
                },
                "rotation": fp.position.angle if fp.position else 0,
                "layer": "front" if fp.layer == "F.Cu" else "back"
            })

        return {
            "success": True,
            "components": components,
            "count": len(components)
        }

    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "components": [],
            "count": 0
        }


def main():
    """Main entry point for the bridge"""
    if len(sys.argv) < 2:
        print(json.dumps({"error": "No command specified", "success": False}))
        sys.exit(1)

    command = sys.argv[1]

    try:
        if command == "create_project":
            # Parse arguments: name, path, layers, width, height
            name = sys.argv[2]
            path = sys.argv[3]
            layers = int(sys.argv[4]) if len(sys.argv) > 4 else 2
            width = float(sys.argv[5]) if len(sys.argv) > 5 else 100.0
            height = float(sys.argv[6]) if len(sys.argv) > 6 else 80.0
            result = create_project(name, path, layers, width, height)

        elif command == "add_component":
            # Parse arguments: pcb_path, value, footprint, x, y, rotation, layer
            pcb_path = sys.argv[2]
            value = sys.argv[3]
            footprint = sys.argv[4]
            x = float(sys.argv[5])
            y = float(sys.argv[6])
            rotation = float(sys.argv[7]) if len(sys.argv) > 7 else 0
            layer = sys.argv[8] if len(sys.argv) > 8 else "front"
            result = add_component(pcb_path, value, footprint, x, y, rotation, layer)

        elif command == "get_components":
            pcb_path = sys.argv[2]
            result = get_components(pcb_path)

        else:
            result = {"error": f"Unknown command: {command}", "success": False}

        print(json.dumps(result))

    except Exception as e:
        print(json.dumps({
            "error": str(e),
            "success": False,
            "message": f"Bridge error: {str(e)}"
        }))
        sys.exit(1)


if __name__ == "__main__":
    main()
