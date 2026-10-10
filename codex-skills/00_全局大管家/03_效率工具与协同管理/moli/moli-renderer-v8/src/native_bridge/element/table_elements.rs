use super::*;

#[derive(WebApiFunctionTemplate)]
#[webapi(interface = web_api_interfaces::HTMLTableSectionElement, enumerable)]
pub(super) struct HtmlTableSectionElementPrototypeMethodsDeclaration {
    #[webapi(method, length = 0, callback = table_section_insert_row_callback)]
    insert_row: (),
    #[webapi(method, length = 1, callback = table_section_delete_row_callback)]
    delete_row: (),
}

#[derive(WebApiFunctionTemplate)]
#[webapi(interface = web_api_interfaces::HTMLTableSectionElement, enumerable)]
pub(super) struct HtmlTableSectionElementPrototypeDeclaration {
    #[webapi(accessor_property, getter = table_section_rows_getter_function)]
    rows: (),
}

#[derive(WebApiFunctionTemplate)]
#[webapi(interface = web_api_interfaces::HTMLTableSectionElement, enumerable)]
pub(super) struct HtmlTableSectionElementLegacyPrototypeDeclaration {
    #[webapi(
        accessor_property,
        getter = table_ch_getter_function,
        setter = dom_string_reflection_setter_function,
        setter_data = DomStringReflection::TableSectionCh
    )]
    ch: (),
    #[webapi(
        accessor_property,
        getter = table_ch_off_getter_function,
        setter = dom_string_reflection_setter_function,
        setter_data = DomStringReflection::TableSectionChOff
    )]
    ch_off: (),
    #[webapi(
        accessor_property,
        getter = table_v_align_getter_function,
        setter = dom_string_reflection_setter_function,
        setter_data = DomStringReflection::TableSectionVAlign
    )]
    v_align: (),
}

#[derive(WebApiFunctionTemplate)]
#[webapi(interface = web_api_interfaces::HTMLTableRowElement, enumerable)]
pub(super) struct HtmlTableRowElementPrototypeMethodsDeclaration {
    #[webapi(method, length = 0, callback = table_row_insert_cell_callback)]
    insert_cell: (),
    #[webapi(method, length = 1, callback = table_row_delete_cell_callback)]
    delete_cell: (),
}

#[derive(WebApiFunctionTemplate)]
#[webapi(interface = web_api_interfaces::HTMLTableRowElement, enumerable)]
pub(super) struct HtmlTableRowElementPrototypeDeclaration {
    #[webapi(accessor_property, getter = table_row_index_getter_function)]
    row_index: (),
    #[webapi(accessor_property, getter = table_section_row_index_getter_function)]
    section_row_index: (),
    #[webapi(accessor_property, getter = table_row_cells_getter_function)]
    cells: (),
}

#[derive(WebApiFunctionTemplate)]
#[webapi(interface = web_api_interfaces::HTMLTableRowElement, enumerable)]
pub(super) struct HtmlTableRowElementLegacyPrototypeDeclaration {
    #[webapi(
        accessor_property = "bgColor",
        getter = html_bg_color_getter_function,
        setter = null_to_empty_dom_string_reflection_setter_function,
        setter_data = NullToEmptyDomStringReflection::TableRowBgColor
    )]
    bg_color: (),
    #[webapi(
        accessor_property,
        getter = table_ch_getter_function,
        setter = dom_string_reflection_setter_function,
        setter_data = DomStringReflection::TableRowCh
    )]
    ch: (),
    #[webapi(
        accessor_property,
        getter = table_ch_off_getter_function,
        setter = dom_string_reflection_setter_function,
        setter_data = DomStringReflection::TableRowChOff
    )]
    ch_off: (),
    #[webapi(
        accessor_property,
        getter = table_v_align_getter_function,
        setter = dom_string_reflection_setter_function,
        setter_data = DomStringReflection::TableRowVAlign
    )]
    v_align: (),
}

#[derive(WebApiFunctionTemplate)]
#[webapi(interface = web_api_interfaces::HTMLTableColElement, enumerable)]
pub(super) struct HtmlTableColElementLegacyPrototypeDeclaration {
    #[webapi(
        accessor_property,
        getter = table_col_span_getter_function,
        setter = table_col_span_setter_function
    )]
    span: (),
    #[webapi(
        accessor_property,
        getter = html_width_getter_function,
        setter = dom_string_reflection_setter_function,
        setter_data = DomStringReflection::TableColWidth
    )]
    width: (),
    #[webapi(
        accessor_property,
        getter = table_ch_getter_function,
        setter = dom_string_reflection_setter_function,
        setter_data = DomStringReflection::TableColCh
    )]
    ch: (),
    #[webapi(
        accessor_property,
        getter = table_ch_off_getter_function,
        setter = dom_string_reflection_setter_function,
        setter_data = DomStringReflection::TableColChOff
    )]
    ch_off: (),
    #[webapi(
        accessor_property,
        getter = table_v_align_getter_function,
        setter = dom_string_reflection_setter_function,
        setter_data = DomStringReflection::TableColVAlign
    )]
    v_align: (),
}

#[derive(WebApiFunctionTemplate)]
#[webapi(interface = web_api_interfaces::HTMLTableCellElement, enumerable)]
pub(super) struct HtmlTableCellElementLegacyPrototypeDeclaration {
    #[webapi(
        accessor_property = "bgColor",
        getter = html_bg_color_getter_function,
        setter = null_to_empty_dom_string_reflection_setter_function,
        setter_data = NullToEmptyDomStringReflection::TableCellBgColor
    )]
    bg_color: (),
    #[webapi(
        accessor_property,
        getter = html_width_getter_function,
        setter = dom_string_reflection_setter_function,
        setter_data = DomStringReflection::TableCellWidth
    )]
    width: (),
    #[webapi(
        accessor_property,
        getter = html_height_getter_function,
        setter = dom_string_reflection_setter_function,
        setter_data = DomStringReflection::TableCellHeight
    )]
    height: (),
    #[webapi(
        accessor_property,
        getter = table_cell_headers_getter_function,
        setter = dom_string_reflection_setter_function,
        setter_data = DomStringReflection::TableCellHeaders
    )]
    headers: (),
    #[webapi(
        accessor_property,
        getter = table_cell_abbr_getter_function,
        setter = dom_string_reflection_setter_function,
        setter_data = DomStringReflection::TableCellAbbr
    )]
    abbr: (),
    #[webapi(
        accessor_property,
        getter = table_cell_axis_getter_function,
        setter = dom_string_reflection_setter_function,
        setter_data = DomStringReflection::TableCellAxis
    )]
    axis: (),
    #[webapi(
        accessor_property,
        getter = table_cell_scope_getter_function,
        setter = dom_string_reflection_setter_function,
        setter_data = DomStringReflection::TableCellScope
    )]
    scope: (),
    #[webapi(
        accessor_property = "noWrap",
        getter = table_cell_no_wrap_getter_function,
        setter = table_cell_no_wrap_setter_function
    )]
    no_wrap: (),
    #[webapi(
        accessor_property,
        getter = table_ch_getter_function,
        setter = dom_string_reflection_setter_function,
        setter_data = DomStringReflection::TableCellCh
    )]
    ch: (),
    #[webapi(
        accessor_property,
        getter = table_ch_off_getter_function,
        setter = dom_string_reflection_setter_function,
        setter_data = DomStringReflection::TableCellChOff
    )]
    ch_off: (),
    #[webapi(
        accessor_property,
        getter = table_v_align_getter_function,
        setter = dom_string_reflection_setter_function,
        setter_data = DomStringReflection::TableCellVAlign
    )]
    v_align: (),
}

#[derive(WebApiFunctionTemplate)]
#[webapi(interface = web_api_interfaces::HTMLTableCellElement, enumerable)]
pub(super) struct HtmlTableCellElementPrototypeDeclaration {
    #[webapi(
        accessor_property,
        getter = table_cell_col_span_getter_function,
        setter = table_cell_col_span_setter_function
    )]
    col_span: (),
    #[webapi(
        accessor_property,
        getter = table_cell_row_span_getter_function,
        setter = table_cell_row_span_setter_function
    )]
    row_span: (),
    #[webapi(accessor_property = "cellIndex", getter = table_cell_index_getter_function)]
    cell_index: (),
}
