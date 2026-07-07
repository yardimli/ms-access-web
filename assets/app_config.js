const ribbons = {
    home: [
        ['Views', [['grid', 'View', '@datasheet'], ['design', 'Design View', '@design']]],
        ['Clipboard', [['paste', 'Paste'], ['cut', 'Cut'], ['copy', 'Copy']]],
        ['Sort & Filter', [['filter', 'Filter'], ['sort-asc', 'Ascending'], ['sort-desc', 'Descending'], ['find', 'Find']]],
        ['Records', [['new', 'New'], ['delete', 'Delete'], ['refresh', 'Refresh']]],
        ['Text Formatting', [['bold', 'Bold'], ['italic', 'Italic'], ['align', 'Align']]]
    ],
    create: [
        ['Tables', [['table', 'Customers', 'table-customers'], ['design', 'Table Design', 'table-detail']]],
        ['Forms', [['form', 'Customer Orders', 'form-customer-orders'], ['form', 'Invoice Entry', 'form-invoice-entry']]],
        ['Queries', [['query', 'Open Orders', 'query-open-orders'], ['query', 'Sales Region', 'query-sales-region']]],
        ['Reports', [['report', 'Invoice Summary', 'report']]]
    ],
    external: [
        ['Import & Link', [['import', 'Saved Imports'], ['excel', 'Excel'], ['access', 'Access'], ['odbc', 'ODBC'], ['more', 'More']]],
        ['Export', [['export', 'Saved Exports'], ['excel', 'Excel'], ['text', 'Text File'], ['email', 'Email']]]
    ],
    database: [
        ['Tools', [['relationships', 'Relationships'], ['deps', 'Object Dependencies'], ['analyze', 'Analyze Table']]],
        ['Macro', [['code', 'Visual Basic'], ['run', 'Run Macro'], ['secure', 'Macro Security']]]
    ],
    fields: [
        ['Views', [['grid', 'View', '@datasheet'], ['design', 'Design View', '@design']]],
        ['Add & Delete', [['text-field', 'Short Text'], ['number', 'Number'], ['currency', 'Currency'], ['date', 'Date & Time'], ['yes-no', 'Yes/No'], ['more-fields', 'More Fields'], ['delete', 'Delete']]],
        ['Properties', [['caption', 'Name & Caption'], ['default', 'Default Value'], ['field-size', 'Field Size'], ['lookup', 'Modify Lookups'], ['expression', 'Modify Expression'], ['memo', 'Memo Settings']]],
        ['Formatting', [['data-type', 'Data Type: AutoNumber'], ['format', 'Format: Formatting'], ['currency-symbol', '$'], ['percent', '%'], ['comma', ','], ['decimal-less', '.00 -> .0'], ['decimal-more', '.0 -> .00']]],
        ['Field Validation', [['required', 'Required'], ['unique', 'Unique'], ['indexed', 'Indexed'], ['validation', 'Validation']]]
    ],
    table: [
        ['Properties', [['properties', 'Table Properties']]],
        ['Before Events', [['before-change', 'Before Change'], ['before-delete', 'Before Delete']]],
        ['After Events', [['after-insert', 'After Insert'], ['after-update', 'After Update'], ['after-delete', 'After Delete']]],
        ['Named Macros', [['macro', 'Named Macro']]],
        ['Relationships', [['relationships', 'Relationships'], ['deps', 'Object Dependencies']]]
    ],
    'table-design': [
        ['Views', [['grid', 'View', '@datasheet']]],
        ['Tools', [['primary-key', 'Primary Key'], ['builder', 'Builder'], ['test-validation', 'Test Validation Rules']]],
        ['Rows', [['insert-row', 'Insert Rows'], ['delete', 'Delete Rows'], ['lookup', 'Modify Lookups']]],
        ['Show/Hide', [['properties', 'Property Sheet'], ['index', 'Indexes']]],
        ['Field, Record & Table Events', [['macro', 'Create Data Macros'], ['rename', 'Rename/Delete Macro']]],
        ['Relationships', [['relationships', 'Relationships'], ['deps', 'Object Dependencies']]]
    ],
    file: [
        ['Backstage', [['save', 'Save'], ['save-as', 'Save As'], ['print', 'Print'], ['options', 'Options']]]
    ],
    help: [
        ['Help', [['find', 'Search Help'], ['options', 'Access Options'], ['secure', 'Privacy']]]
    ]
};

const viewTitles = {
    'table-customers': 'Customers',
    'table-orders': 'Orders',
    'table-order-items': 'OrderItems',
    'table-products': 'Products',
    'table-regions': 'Regions',
    'table-sales-targets': 'SalesTargets',
    'design-customers': 'Customers',
    'design-orders': 'Orders',
    'design-order-items': 'OrderItems',
    'design-products': 'Products',
    'design-regions': 'Regions',
    'design-sales-targets': 'SalesTargets',
    'table-detail': 'Customers',
    'form-customer-orders': 'CustomerOrders',
    'form-invoice-entry': 'InvoiceEntry',
    'design-form-customer-orders': 'CustomerOrders',
    'design-form-invoice-entry': 'InvoiceEntry',
    'query-open-orders': 'OpenOrders',
    'query-sales-region': 'SalesByRegion',
    report: 'InvoiceSummary'
};

const content = document.querySelector('#content');
const ribbon = document.querySelector('#ribbon');
const tabs = document.querySelector('#document-tabs');
const status = document.querySelector('#view-status');
const app = document.querySelector('#access-app');
const workspaceMain = document.querySelector('#workspace-main');
const objectPane = document.querySelector('#object-pane');
const contextualToolsLabel = document.querySelector('#contextual-tools-label');
const tableToolsTabs = document.querySelector('#table-tools-tabs');
const formToolsTabs = document.querySelector('#form-tools-tabs');
const objectList = document.querySelector('#object-list');
const statusViewButtons = document.querySelector('#status-view-buttons');

let databasePromise = null;
let currentView = app.dataset.initialView || 'table-customers';
let openTabs = [];
let currentRibbon = 'home';
let moreFieldsMenu = null;
let validationMenu = null;
let createMenu = null;
let statusModeOverride = null;

const moreFieldsGroups = [
    ['Basic Types', [
        ['rich-text', 'Rich Text'],
        ['attachment', 'Attachment'],
        ['hyperlink', 'Hyperlink'],
        ['long-text', 'Long Text'],
        ['lookup', 'Lookup & Relationship']
    ]],
    ['Number', [
        ['number', 'General'],
        ['currency', 'Currency'],
        ['euro', 'Euro'],
        ['number', 'Fixed'],
        ['number', 'Standard'],
        ['scientific', 'Scientific']
    ]],
    ['Large Number', [
        ['number', 'General'],
        ['number', 'Fixed'],
        ['number', 'Standard'],
        ['scientific', 'Scientific']
    ]],
    ['Date and Time', [
        ['short-date', 'Short Date'],
        ['short-date', 'Medium Date'],
        ['short-date', 'Long Date'],
        ['time', 'Time am/pm'],
        ['time', 'Medium Time'],
        ['time', 'Time 24hour']
    ]],
    ['Yes/No', [
        ['checkbox', 'Check Box'],
        ['checkbox', 'Yes/No'],
        ['checkbox', 'True/False'],
        ['checkbox', 'On/Off']
    ]],
    ['Quick Start', [
        ['quick-start', 'Address'],
        ['quick-start', 'Category'],
        ['quick-start', 'Name'],
        ['quick-start', 'Payment Type'],
        ['quick-start', 'Phone'],
        ['quick-start', 'Priority'],
        ['quick-start', 'Start and End Dates'],
        ['quick-start', 'Status'],
        ['quick-start', 'Tag']
    ]]
];

const calculatedFieldTypes = [
    ['text-field', 'Text'],
    ['number', 'Number'],
    ['currency', 'Currency'],
    ['yes-no', 'Yes/No'],
    ['date', 'Date/Time']
];

const createDropdowns = {
    navigation: [
        ['navigation', 'Horizontal Tabs'],
        ['navigation', 'Vertical Tabs, Left'],
        ['navigation', 'Vertical Tabs, Right'],
        ['navigation', 'Horizontal Tabs, 2 Levels'],
        ['navigation', 'Horizontal Tabs and Vertical Tabs, Left'],
        ['navigation', 'Horizontal Tabs and Vertical Tabs, Right']
    ],
    'more-forms': [
        ['form', 'Multiple Items'],
        ['table', 'Datasheet'],
        ['split-form', 'Split Form'],
        ['modal-dialog', 'Modal Dialog']
    ]
};

const homeDropdowns = {
    paste: [
        { icon: 'paste', label: 'Paste' },
        { icon: 'paste-special', label: 'Paste Special...' },
        { icon: 'paste-append', label: 'Paste Append' }
    ],
    view: [
        { icon: 'grid', label: 'Datasheet View', view: '@datasheet', strong: true },
        { icon: 'design', label: 'Design View', view: '@design', strong: true }
    ],
    selection: [
        { icon: 'filter', label: 'Equals Blank' },
        { icon: 'filter', label: 'Does Not Equal Blank' }
    ],
    advanced: [
        { icon: 'clear-filter', label: 'Clear All Filters', disabled: true },
        { icon: 'filter-form', label: 'Filter By Form' },
        { icon: 'apply-filter', label: 'Apply Filter/Sort' },
        { icon: 'advanced-filter', label: 'Advanced Filter/Sort...' },
        { icon: 'folder', label: 'Load from Query...', disabled: true },
        { icon: 'save-as', label: 'Save As Query', disabled: true },
        { icon: 'delete-tab', label: 'Delete Tab' },
        { icon: 'clear-grid', label: 'Clear Grid' },
        { icon: 'close', label: 'Close' }
    ],
    more: [
        { icon: 'outlook', label: 'Add From Outlook', disabled: true },
        { icon: 'contact', label: 'Save As Outlook Contact', disabled: true },
        { icon: 'row-height', label: 'Row Height...' },
        { icon: 'subdatasheet', label: 'Subdatasheet', submenu: [
            { icon: 'subdatasheet', label: 'Subdatasheet...' },
            { icon: 'remove', label: 'Remove', disabled: true },
            { icon: 'expand', label: 'Expand All', disabled: true },
            { icon: 'collapse', label: 'Collapse All', disabled: true }
        ] },
        { icon: 'hide-fields', label: 'Hide Fields' },
        { icon: 'unhide-fields', label: 'Unhide Fields' },
        { icon: 'freeze', label: 'Freeze Fields' },
        { icon: 'unfreeze', label: 'Unfreeze All Fields' },
        { icon: 'field-width', label: 'Field Width' }
    ],
    goto: [
        { icon: 'first', label: 'First' },
        { icon: 'previous', label: 'Previous' },
        { icon: 'next', label: 'Next', disabled: true },
        { icon: 'last', label: 'Last' },
        { icon: 'new', label: 'New', disabled: true }
    ],
    select: [
        { icon: 'pointer', label: 'Select' },
        { icon: 'select-all', label: 'Select All' }
    ],
    font: [
        { label: 'Calibri Light (Header)', family: 'Calibri Light' },
        { label: 'Calibri (Detail)', family: 'Calibri' },
        { label: 'Arial', family: 'Arial' },
        { label: 'Arial Black', family: 'Arial Black', strong: true },
        { label: 'Arial Narrow', family: 'Arial Narrow' },
        { label: 'Bahnschrift', family: 'Bahnschrift' },
        { label: 'Bahnschrift Condensed', family: 'Bahnschrift Condensed' },
        { label: 'Bahnschrift Light', family: 'Bahnschrift Light' },
        { label: 'Bahnschrift SemiBold', family: 'Bahnschrift SemiBold', strong: true },
        { label: 'Book Antiqua', family: 'Book Antiqua' },
        { label: 'Bookman Old Style', family: 'Bookman Old Style' },
        { label: 'Calibri', family: 'Calibri' },
        { label: 'Cambria', family: 'Cambria' },
        { label: 'Candara', family: 'Candara' },
        { label: 'Cascadia Code', family: 'Cascadia Code', strong: true }
    ],
    size: ['8', '9', '10', '11', '12', '14', '16', '18', '20', '22', '24', '26', '28', '36', '48', '72'].map(label => ({ label, active: label === '11' })),
    gridlines: [
        { icon: 'gridlines-both', label: 'Gridlines: Both', strong: true },
        { icon: 'gridlines-horizontal', label: 'Gridlines: Horizontal', strong: true },
        { icon: 'gridlines-vertical', label: 'Gridlines: Vertical', strong: true },
        { icon: 'gridlines-none', label: 'Gridlines: None', strong: true }
    ],
    color: [
        { colorGrid: true }
    ]
};


let tableViewPairs = {};
let designViewPairs = {};
let formViewPairs = {};
let formDesignViewPairs = {};

