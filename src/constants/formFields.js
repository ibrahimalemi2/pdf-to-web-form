// Initial default fields matching Assignment Submission Form
export const INITIAL_FIELDS = [
  {
    id: 'field_assign',
    type: 'Short Text',
    label: 'Assignment',
    placeholder: 'e.g. Assignment 1 - Parallel and Distributed Computing',
    helperText: 'Official assignment title and identifier detected from header',
    value: '',
    required: true,
    readOnly: false,
    hidden: false,
    columnSpan: 1,
    pdfMapping: {
      page: 1,
      badgeW: '240.0',
      badgeH: '26.6',
      x: '24%',
      y: '16%',
      w: '48%',
      h: '4.8%'
    }
  },
  {
    id: 'field_section',
    type: 'Short Text',
    label: 'Section',
    placeholder: 'e.g. Section A',
    helperText: 'Course section or academic division',
    value: '',
    required: true,
    readOnly: false,
    hidden: false,
    columnSpan: 1,
    pdfMapping: {
      page: 1,
      badgeW: '142.5',
      badgeH: '26.6',
      x: '74%',
      y: '16%',
      w: '22%',
      h: '4.8%'
    }
  },
  {
    id: 'field_teacher',
    type: 'Short Text',
    label: 'Teacher',
    placeholder: 'e.g. Yousra Rehman',
    helperText: 'Assigned course faculty instructor',
    value: '',
    required: true,
    readOnly: false,
    hidden: false,
    columnSpan: 1,
    pdfMapping: {
      page: 1,
      badgeW: '240.0',
      badgeH: '26.6',
      x: '24%',
      y: '22%',
      w: '48%',
      h: '4.8%'
    }
  },
  {
    id: 'field_class',
    type: 'Short Text',
    label: 'Class',
    placeholder: 'e.g. BSCS Fall 2026',
    helperText: 'Degree program and academic cohort',
    value: '',
    required: true,
    readOnly: false,
    hidden: false,
    columnSpan: 1,
    pdfMapping: {
      page: 1,
      badgeW: '142.5',
      badgeH: '26.6',
      x: '74%',
      y: '22%',
      w: '22%',
      h: '4.8%'
    }
  },
  {
    id: 'field_student',
    type: 'Short Text',
    label: 'Student Name / Roll no',
    placeholder: 'e.g. Mohammad Ibrahim / F23-2353',
    helperText: 'Student identification and roll credentials',
    value: '',
    required: true,
    readOnly: false,
    hidden: false,
    columnSpan: 2,
    pdfMapping: {
      page: 1,
      badgeW: '380.0',
      badgeH: '26.6',
      x: '24%',
      y: '28%',
      w: '72%',
      h: '4.8%'
    }
  },
  {
    id: 'field_sub_date',
    type: 'Date',
    label: 'Submission Date/Time',
    placeholder: 'YYYY - MM - DD',
    format: 'YYYY-MM-DD',
    datePlaceholderYear: 'YYYY',
    datePlaceholderMonth: 'MM',
    datePlaceholderDay: 'DD',
    datePreset: 'Any date',
    dateRangeStart: 'No limit',
    dateRangeEnd: 'No limit',
    dateErrorMessage: '',
    align: 'left',
    printInPdf: true,
    pdfFont: 'Roboto',
    pdfFontSize: 10,
    pdfFontColor: '#000000',
    pdfLetterSpacing: 0,
    pdfLineSpacing: 2,
    pdfMonospaced: true,
    pdfOverflowSmaller: true,
    pdfOverflowWrap: true,
    pdfTextSpacing: 'Natural',
    helperText: 'Official assignment submission deadline',
    value: '',
    required: false,
    readOnly: false,
    hidden: false,
    columnSpan: 2,
    pdfMapping: {
      page: 1,
      badgeW: '380.0',
      badgeH: '26.6',
      x: '24%',
      y: '34%',
      w: '72%',
      h: '4.8%'
    }
  },
  {
    id: 'field_ans1',
    type: 'Long Text',
    label: 'Answer 1',
    placeholder: 'Enter response for Question 1 (Synchronous communication)...',
    helperText: 'Answer block for Problem 1',
    value: '',
    required: false,
    readOnly: false,
    hidden: false,
    columnSpan: 2,
    pdfMapping: {
      page: 1,
      badgeW: '465.0',
      badgeH: '90.0',
      x: '24%',
      y: '42%',
      w: '72%',
      h: '18.0%'
    }
  },
  {
    id: 'field_ans2',
    type: 'Long Text',
    label: 'Answer 2',
    placeholder: 'Enter response for Question 2...',
    helperText: 'Answer block for Problem 2',
    value: '',
    required: false,
    readOnly: false,
    hidden: false,
    columnSpan: 2,
    pdfMapping: {
      page: 1,
      badgeW: '465.0',
      badgeH: '90.0',
      x: '24%',
      y: '65%',
      w: '72%',
      h: '18.0%'
    }
  }
];

// AI Auto-Detected Form Fields
export const AI_DETECTED_FIELDS = INITIAL_FIELDS;

