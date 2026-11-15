# CorelDRAW toolbox coverage / Покрытие тулбокса CorelDRAW

Checklist: a CorelDRAW toolbox item → the MCP tool that drives it. Toolbox names are given in
both UI languages, English (Russian), so an item can be found whichever localization CorelDRAW
runs in. **This file is the single source of truth for coverage** — `README.md` and
`README.ru.md` link here and do not repeat the list, because two copies of one checklist drift
apart on the first edit.

The add-on follows CorelDRAW's own toolbox: every item the object model can drive has an MCP
tool, and every item it cannot drive is listed here **with the reason** instead of being quietly
dropped.

**Tools can be seen and switched off from the panel.** The docker (the *CorelDRAW MCP Server*
panel) has a **Tools** button that opens the full list with checkboxes. Unticking one removes it
from `tools/list` and makes `tools/call` reject it; the choice is stored in `config.json`
(`DisabledTools`) and applied to the running server immediately.

Legend:

- `[x]` — implemented in MCP (the tool name is given);
- `[ ]` — not implemented yet;
- `[~]` — cannot be implemented: the item has no programmatic interface in CorelDRAW's object
  model (VGCore) and works only interactively with the mouse.

One line can cover several related toolbox buttons (the three shape-modification tools,
the four Artistic Media variants), so counting lines and counting buttons are different things.

## 1. Selection and navigation / Выделение и навигация

- `[x]` **Pick** (Выбор) — `select_shapes` / `clear_selection` / `get_selection`
- `[x]` **Free Transform** (Свободное преобразование) — `skew_shape` (skew); the other handles:
  `move_shape` / `set_shape_size` / `rotate_shape`
- `[~]` **Freehand Pick** (Свободное выделение) — interactive lasso, no programmatic interface;
  use `select_shapes` with `index` / `name` / `type` / `all` instead
- `[x]` **Zoom** (Масштаб) — `set_zoom`
- `[x]` **Pan** (Панорама) — `set_zoom` (`originX` / `originY`)

## 2. Shape geometry and editing / Геометрия и правка формы

- `[~]` **Shape: Smudge, Roughen, Smooth** (Формы: размывание, огрубление, сглаживание) —
  interactive node editing, no programmatic interface
- `[~]` **Freehand** (Свободная) — no interactive tool; a smoothed curve through points is built
  by `create_curve` (`mode = "smooth"`)
- `[~]` **Smart Drawing** (Умное рисование) — no programmatic interface
- `[x]` **2-Point Line / Bezier / Pen / Polyline / 3-Point Curve** (Линия / Безье / Перо /
  Ломаная / Кривая по 3 точкам) — `create_line`, `create_curve` (`mode = "polyline"` /
  `"smooth"`, control points `c1x`/`c1y`/`c2x`/`c2y`, where `c1` is a node's incoming handle and
  `c2` its outgoing one; an omitted handle is smoothed with a Catmull-Rom tangent)
- `[x]` **Fillet / Chamfer / Scallop** (Скругление / фаска / выемка) — `fillet_shape` /
  `chamfer_shape` / `scallop_shape`
- `[~]` **Crop** (Обрезка) — no programmatic interface
- `[~]` **Knife** (Нож) — no programmatic interface; the nearest equivalent is `trim_shapes`, or
  `combine_shapes` + `break_apart_shapes`
- `[~]` **Eraser** (Ластик) — no programmatic interface
- `[~]` **Virtual Segment Delete** (Виртуальное удаление сегмента) — no programmatic interface

## 3. Drawing / Рисование

- `[~]` **Artistic Media** (Живописная кисть): brush, sprayer, calligraphic, pressure — no
  programmatic interface; a stroke can be approximated by building a curve with `create_curve`
- `[x]` **Rectangle / 3-Point Rectangle** (Прямоугольник / по 3 точкам) — `create_rectangle`
- `[x]` **Ellipse / 3-Point Ellipse** (Эллипс / по 3 точкам) — `create_ellipse`
- `[x]` **Polygon** (Многоугольник) — `create_polygon`
- `[x]` **Star / Complex Star** (Звезда / сложная звезда) — `create_star` (the outline is built
  vertex by vertex: `2 × points` vertices alternating between `radius` and `radius × innerRatio`,
  default `0.4`, first ray up; works for any point count, 4 included)
- `[x]` **Spiral** (Спираль) — `create_spiral`
- `[x]` **Graph Paper** (Диаграммная сетка) — `create_graph_paper`

## 4. Text / Текст

- `[x]` **Artistic / Paragraph text** (Фигурный / простой текст) — `create_text` /
  `create_paragraph_text` / `get_text` / `replace_text` / `convert_text_type` (`get_text`,
  `replace_text` and `convert_text_to_curves` without a shape target cover every page of the
  document)
- `[x]` **Text to curves** (Текст в кривые) — `convert_text_to_curves`
- `[~]` **Table** (Таблица) — no programmatic interface
- `[x]` **Text on a path / inside a shape** (Текст по кривой / по фигуре) — `fit_text_to_path` /
  `place_text_inside` (inside a shape only paragraph text — CorelDRAW requires it)
- `[~]` **Glyphs** (Глифы) — no programmatic interface

## 5. Dimensions and connectors / Размеры и соединители

- `[x]` **Parallel dimension** (Параллельный размер) — `create_dimension` (`type = "slanted"`)
- `[x]` **Horizontal / vertical dimension** (Горизонтальный / вертикальный размер) —
  `create_dimension` (`type = "horizontal"` / `"vertical"`)
- `[x]` **Angular dimension** (Угловой размер) — `create_dimension` (`type = "angular"`, three
  points)
- `[~]` **Segment dimension** (Размер сегмента) — no programmatic interface (the object model has
  only horizontal / vertical / slanted)
- `[~]` **Callout** (Выноска) — no programmatic interface
- `[x]` **Connector** (Соединительная линия) — `create_connector` (`straight` / `rightAngle` /
  `bspline` / `bezier`)
- `[~]` **Edit Anchor** (Изменение узла) — no programmatic interface

## 6. Fill, outline, colour / Заливка, абрис, цвет

- `[~]` **Color Eyedropper** (Цветовая пипетка) — interactive colour picking, no programmatic
  interface; `get_shape_color` reports the fill and outline type and colours (hex, RGB, CMYK)
- `[x]` **Attributes Eyedropper** (Пипетка атрибутов) — `copy_properties`
- `[x]` **Interactive fill: uniform / fountain** (Однородная / градиентная заливка) —
  `set_fill_color` / `set_fill_gradient`
- `[x]` **Pattern, texture, PostScript fill** (Узор, текстура, PostScript) — `set_fill_pattern` /
  `set_fill_texture` / `set_fill_postscript`
- `[~]` **Mesh Fill** (Сетчатая заливка) — no programmatic interface
- `[~]` **Smart Fill** (Умная заливка) — no programmatic interface
- `[x]` **Outline: colour / width / none** (Абрис: цвет / толщина / отсутствие) —
  `set_outline_color` / `set_outline_width` / `set_outline_none`
- `[~]` **Interactive Outline Width** (Переменный абрис) — no programmatic interface
- `[x]` **Transparency tool** (Инструмент прозрачности) — `set_transparency` /
  `clear_transparency`
- `[~]` **Color Harmony** (Гармония цветов) — no programmatic interface

## 7. Interactive effects / Интерактивные эффекты

- `[x]` **Blend** (Перетекание) — `blend_shapes`
- `[x]` **Contour** (Ореол) — `contour_shape`
- `[x]` **Distort** (Искажение) — `distort_shape` (`pushPull` / `twister` / `zipper`)
- `[x]` **Drop Shadow** (Тень) — `drop_shadow`
- `[x]` **Envelope** (Оболочка) — `envelope_shape`
- `[x]` **Extrude** (Вытягивание) — `extrude_shape`
- `[x]` **Lens** (Линза) — `lens_shape`
- `[x]` **Adjust** (Настройка) — `adjust_color` (`invert` / `gamma` / `posterize` /
  `colorBalance` / `bci` / `hsl`)
- `[x]` **Effect management** (Управление эффектами) — `clear_effect` / `flatten_effects` /
  `separate_shape`
- `[~]` **Rollover** (Ролловер) — no programmatic interface

## 8. Object composition / Компоновка объекта

- `[x]` **Group / ungroup** (Группа / разгруппировать) — `group_shapes` / `ungroup_shapes`
- `[x]` **Combine / break apart** (Объединение / разъединение) — `combine_shapes` /
  `break_apart_shapes`
- `[x]` **Weld / intersect / trim** (Сварка / пересечение / исключение) — `weld_shapes` /
  `intersect_shapes` / `trim_shapes`
- `[x]` **Stacking order** (Порядок наложения: front / back / forward / backward) — `order_shape`
- `[x]` **Align** (Выравнивание) — `align_shapes`
- `[x]` **Transforms: size / scale / move / rotate / skew** (Размер / масштаб / перемещение /
  поворот / наклон) — `set_shape_size` / `scale_shape` / `move_shape` / `rotate_shape` /
  `skew_shape`
- `[x]` **Duplicate** (Дублирование) — `duplicate_shape`
- `[x]` **Object manager (read)** (Диспетчер объектов, чтение) — `list_shapes` /
  `get_shape_info` / `list_layers`
- `[x]` **Symbol** (Символ) — `convert_to_symbol` / `revert_symbol_to_shapes`
- `[x]` **PowerClip** — `place_in_powerclip` / `extract_powerclip`
- `[x]` **Clone** (Клонирование) — `clone_shape`
- `[~]` **Symmetry** (Симметрия) — no programmatic interface

## 9. Page, layers, layout / Страница, слои, макет

- `[x]` **Page: add / list / size / orientation / units / make active** (Страница: добавить /
  список / размер / ориентация / единицы / сделать активной) — `add_page` / `get_pages` /
  `set_page_size` / `set_page_orientation` / `set_document_unit` / `set_active_page`
- `[x]` **Layer: create / list / properties / active / move shapes / delete** (Слой: создать /
  список / свойства / активный / перенос фигур / удалить) — `create_layer` / `list_layers` /
  `set_layer` / `set_active_layer` / `move_shapes_to_layer` / `delete_layer`
- `[x]` **Guides** (Направляющие) — `add_guide` / `list_guides` / `delete_guides`
- `[x]` **Grid** (Сетка) — `set_grid`

## 10. Document and output / Документ и вывод

Not toolbox items — included for completeness of coverage.

- `[x]` `create_document` / `open_document` / `save_document` / `save_document_as` /
  `close_document` / `list_documents` / `get_document_info`
- `[x]` `export` (any supported format: PNG, JPEG, TIFF, GIF, BMP, SVG, EPS, AI, PDF, DXF and
  others)
- `[x]` `export_pdf` / `export_png` / `export_svg` / `export_dxf`
- `[x]` `import_image` / `import_svg`
- `[x]` `server_status` / `server_log`
