// Column definitions for the Excel export / import of GUWIP, DOKTOR, TRPATU and SAGUT.
// `header` must match the header text in row 10 of server/templates/<program>-template.xlsx
// (a trailing " *" is ignored). The template decides WHERE each column sits.
const { FIRST_DATA_ROW } = require('./gip-excel')

const LAYOUT = {
  groupRow: FIRST_DATA_ROW - 2,
  headerRow: FIRST_DATA_ROW - 1,
  firstDataRow: FIRST_DATA_ROW,
  noColumn: 2,
  title: 'A1:C6', // "<ACRONYM> DATA <year>"
}

const SEX = ['Male', 'Female']
const SEX_ALIASES = { m: 'Male', f: 'Female' }
const CIVIL = ['Single', 'Married', 'Widowed', 'Separated']
const CIVIL_ALIASES = { s: 'Single', m: 'Married', w: 'Widowed', widow: 'Widowed', widower: 'Widowed', sp: 'Separated' }

// ---- column builders (required: true marks the column as required on import) ----
const text = (key, header, group, o = {}) => ({ key, header, group, type: 'text', max: 100, ...o })
const phone = (key, header, group, o = {}) => ({ key, header, group, type: 'phone', max: 30, ...o })
const email = (key, header, group, o = {}) => ({ key, header, group, type: 'email', max: 150, ...o })
const date = (key, header, group, o = {}) => ({ key, header, group, type: 'date', ...o })
const number = (key, header, group, o = {}) => ({ key, header, group, type: 'number', ...o })
const check = (key, header, group) => ({ key, header, group, type: 'check' })
const choice = (key, header, group, options, o = {}) => ({ key, header, group, type: 'enum', options, ...o })
const sex = (key, header, group) => choice(key, header, group, SEX, { aliases: SEX_ALIASES, required: true })
const civil = (key, header, group, o = {}) => choice(key, header, group, CIVIL, { aliases: CIVIL_ALIASES, ...o })
const name = (g, last = 'Last Name', first = 'First Name') => [
  text('lastName', last, g, { required: true }),
  text('firstName', first, g, { required: true }),
  text('middleName', 'Middle Name', g),
]

const PROGRAMS = {
  guwip: {
    acronym: 'GUWIP',
    fullName: 'Gayyem Ti Umili Work Internship Program',
    dupKeys: ['lastName', 'firstName', 'birthdate'],
    deriveAge: true,
    columns: [
      ...name('PERSONAL INFORMATION', 'Surname'),
      text('nameExtension', 'Extension Name', 'PERSONAL INFORMATION', { max: 20 }),
      date('birthdate', 'Date of Birth', 'PERSONAL INFORMATION', { required: true }),
      number('age', 'Age', 'PERSONAL INFORMATION', { int: true, max: 120 }),
      sex('sex', 'Sex', 'PERSONAL INFORMATION'),
      civil('civilStatus', 'Civil Status', 'PERSONAL INFORMATION'),
      text('street', 'House/Block/Lot/Street', 'ADDRESS', { max: 150 }),
      text('barangay', 'Barangay', 'ADDRESS', { required: true }),
      text('municipality', 'Municipality', 'ADDRESS', { required: true }),
      text('province', 'Province', 'ADDRESS', { default: 'Nueva Vizcaya' }),
      text('zipCode', 'ZIP Code', 'ADDRESS', { max: 10 }),
      phone('mobileNumber', 'Mobile No.', 'CONTACT INFORMATION'),
      email('email', 'Email Address', 'CONTACT INFORMATION'),
      text('emergencyContactPerson', 'Emergency Contact Person', 'CONTACT INFORMATION', { max: 150 }),
      text('emergencyRelationship', 'Emergency Relationship', 'CONTACT INFORMATION', { max: 50 }),
      phone('emergencyContactNumber', 'Emergency Contact No.', 'CONTACT INFORMATION'),
      choice('highestEducation', 'Highest Educational Attainment', 'EDUCATIONAL BACKGROUND',
        ['Senior High School Graduate', 'College Graduate', 'Post-graduate', 'Technical-Vocational Graduate']),
      text('schoolName', 'Name of School/University', 'EDUCATIONAL BACKGROUND', { max: 200 }),
      text('course', 'Course/Degree', 'EDUCATIONAL BACKGROUND', { max: 150 }),
      text('major', 'Major/Specialization', 'EDUCATIONAL BACKGROUND', { max: 150 }),
      number('yearGraduated', 'Year Graduated', 'EDUCATIONAL BACKGROUND', { int: true, min: 1900, max: 2200 }),
      text('professionalLicense', 'Professional License/Eligibility', 'EDUCATIONAL BACKGROUND', { max: 200 }),
      { key: 'trainings', header: 'Relevant Training/Certifications (Title | Hours | Date, one per line)', group: 'TRAININGS', type: 'trainings' },
      check('freshGraduate', 'Fresh Graduate', 'CURRENT EMPLOYMENT STATUS'),
      check('youngProfessional', 'Young Professional', 'CURRENT EMPLOYMENT STATUS'),
      check('firstTimeJobseeker', 'First Time Jobseeker', 'CURRENT EMPLOYMENT STATUS'),
      check('unemployed', 'Unemployed', 'CURRENT EMPLOYMENT STATUS'),
      check('underemployed', 'Underemployed', 'CURRENT EMPLOYMENT STATUS'),
      text('employer', 'Employer (if underemployed)', 'EMPLOYMENT INFORMATION', { max: 150 }),
      text('position', 'Position', 'EMPLOYMENT INFORMATION'),
      choice('employmentType', 'Employment Type', 'EMPLOYMENT INFORMATION', ['Permanent', 'Temporary', 'Contractual', 'Part-time']),
      number('monthlyIncome', 'Monthly Income', 'EMPLOYMENT INFORMATION', { money: true, max: 9999999999 }),
      text('remarks', 'Remarks', 'REMARKS', { max: 50 }),
    ],
  },

  doktor: {
    acronym: 'DOKTOR',
    fullName: 'Doktor ti Umili Scholarship Program',
    dupKeys: ['lastName', 'firstName', 'birthdate'],
    deriveAge: true,
    columns: [
      date('dateApplied', 'Date of Application', 'APPLICATION INFO', { required: true }),
      ...name('APPLICANT INFORMATION'),
      text('nameExtension', 'Extension Name', 'APPLICANT INFORMATION', { max: 20 }),
      phone('contactNumber', 'Contact No.', 'APPLICANT INFORMATION', { required: true }),
      sex('sex', 'Sex', 'APPLICANT INFORMATION'),
      date('birthdate', 'Birthdate', 'APPLICANT INFORMATION', { required: true }),
      text('address', 'Address', 'APPLICANT INFORMATION', { max: 255, required: true }),
      number('age', 'Age', 'APPLICANT INFORMATION', { int: true, max: 120 }),
      civil('civilStatus', 'Civil Status', 'APPLICANT INFORMATION'),
      number('yearsResidency', 'Years of Residency in Nueva Vizcaya', 'APPLICANT INFORMATION', { int: true, max: 120 }),
      text('premedCourse', 'Pre-Med Course', 'PRE-MED AND EXAMINATIONS', { max: 150 }),
      text('medExamResult', 'Medical School Entrance Exam Result/Rating', 'PRE-MED AND EXAMINATIONS', { max: 50 }),
      date('medExamDate', 'Medical Exam Date', 'PRE-MED AND EXAMINATIONS', { allowFuture: true }),
      text('nmatResult', 'NMAT Result/Rating', 'PRE-MED AND EXAMINATIONS', { max: 50 }),
      date('nmatExamDate', 'NMAT Exam Date', 'PRE-MED AND EXAMINATIONS', { allowFuture: true }),
      text('schoolLastAttended', 'School Last Attended', 'SCHOOL AND AWARDS', { max: 200 }),
      number('gwa', 'GWA', 'SCHOOL AND AWARDS', { max: 100 }),
      text('awards', 'Award/s Received', 'SCHOOL AND AWARDS', { max: 5000 }),
      number('gwaFirstYear', 'GWA 1st Year', 'GWA PER YEAR LEVEL', { max: 100 }),
      number('gwaSecondYear', 'GWA 2nd Year', 'GWA PER YEAR LEVEL', { max: 100 }),
      number('gwaThirdYear', 'GWA 3rd Year', 'GWA PER YEAR LEVEL', { max: 100 }),
      number('gwaFourthYear', 'GWA 4th Year (Medical Clerk)', 'GWA PER YEAR LEVEL', { max: 100 }),
      number('gwaInternship', 'GWA Internship', 'GWA PER YEAR LEVEL', { max: 100 }),
      number('gwaReviewForBoard', 'GWA Review for Board', 'GWA PER YEAR LEVEL', { max: 100 }),
      choice('employmentStatus', 'Employment Status', 'CURRENT EMPLOYMENT', ['Employed', 'Self-Employed', 'Unemployed']),
      text('placeOfWork', 'Place of Work', 'CURRENT EMPLOYMENT', { max: 255 }),
    ],
  },

  trpatu: {
    acronym: 'TRPATU',
    fullName: 'Trabaho Para Ti Umili',
    dupKeys: ['lastName', 'firstName', 'birthdate'],
    columns: [
      ...name('APPLICANT INFORMATION'),
      text('nameExtension', 'Extension Name', 'APPLICANT INFORMATION', { max: 20 }),
      date('birthdate', 'Birthdate', 'APPLICANT INFORMATION', { required: true }),
      sex('sex', 'Sex', 'APPLICANT INFORMATION'),
      civil('civilStatus', 'Civil Status', 'APPLICANT INFORMATION', { required: true }),
      text('address', 'Address', 'APPLICANT INFORMATION', { max: 255, required: true }),
      text('idType', 'Type of ID', 'ID, OCCUPATION AND INCOME', { max: 50 }),
      text('idNumber', 'I.D. Number', 'ID, OCCUPATION AND INCOME', { max: 50 }),
      phone('contactNumber', 'Contact Number', 'ID, OCCUPATION AND INCOME'),
      text('occupation', 'Occupation', 'ID, OCCUPATION AND INCOME'),
      number('averageMonthlyIncome', 'Average Monthly Income', 'ID, OCCUPATION AND INCOME', { money: true, max: 9999999999 }),
      choice('beneficiaryType', 'Type of Beneficiary', 'BENEFICIARY INFORMATION', ['Father', 'Mother', 'Son', 'Daughter'], { required: true }),
      text('beneficiaryLastName', 'Beneficiary Last Name', 'BENEFICIARY INFORMATION', { required: true }),
      text('beneficiaryFirstName', 'Beneficiary First Name', 'BENEFICIARY INFORMATION', { required: true }),
      text('beneficiaryMiddleName', 'Beneficiary Middle Name', 'BENEFICIARY INFORMATION'),
      text('skillsTrainingNeed', 'Skills Training Need', 'BENEFICIARY INFORMATION', { max: 150 }),
      text('yearLevel', 'Year Level', 'BENEFICIARY INFORMATION', { max: 30 }),
      text('remarks', 'Remarks', 'REMARKS', { max: 1000 }),
    ],
  },

  sagut: {
    acronym: 'SAGUT',
    fullName: 'Provincial Scholarship Program of Nueva Vizcaya',
    dupKeys: ['lastName', 'firstName', 'contactNumber'],
    columns: [
      date('submissionDate', 'Date of Submission of Application Letter', 'APPLICATION INFO', { required: true }),
      ...name('APPLICANT'),
      choice('gender', 'Gender', 'APPLICANT', SEX, { aliases: SEX_ALIASES, required: true }),
      phone('contactNumber', 'Contact Number', 'APPLICANT', { required: true }),
      number('familyIncome', 'Average 12 Months Family Income (Php)', '1ST SCREENING REQUIREMENTS', { money: true, max: 999999999 }),
      text('incomeSources', 'Sources', '1ST SCREENING REQUIREMENTS', { max: 255 }),
      text('municipality', 'Municipality', '1ST SCREENING REQUIREMENTS', { required: true }),
      text('barangay', 'Barangay', '1ST SCREENING REQUIREMENTS', { required: true }),
      number('yearsResidency', 'Years of Residency in NV', '1ST SCREENING REQUIREMENTS', { max: 120 }),
      check('ip', 'IP', 'SECTOR'),
      check('women', 'Women', 'SECTOR'),
      check('pwd', 'PWD', 'SECTOR'),
      check('urbanPoor', 'Urban Poor', 'SECTOR'),
      check('soloParentChild', 'Solo Parent Child', 'SECTOR'),
      check('fourPs', '4Ps', 'SECTOR'),
      text('highSchool', 'HS Last Attended', 'EDUCATION / ADMISSION', { max: 150 }),
      number('age', 'Age (as of filling date)', 'EDUCATION / ADMISSION', { int: true, max: 120 }),
      date('admissionTestDate', 'Date NVSU Admission Test Passed', 'EDUCATION / ADMISSION'),
      text('rating', 'Rating', 'EDUCATION / ADMISSION', { max: 20 }),
      text('course', 'Course', 'EDUCATION / ADMISSION', { max: 150 }),
      text('placeOfStudy', 'Place of Study', 'EDUCATION / ADMISSION', { max: 150 }),
      ...[['first', '1st'], ['second', '2nd'], ['third', '3rd'], ['fourth', '4th']].flatMap(([k, y]) => [
        number(`${k}YearFirstSem`, `${y} Year - 1st Sem`, 'GWA', { max: 100 }),
        number(`${k}YearSecondSem`, `${y} Year - 2nd Sem`, 'GWA', { max: 100 }),
      ]),
      text('awardsReceived', 'Awards Received', 'AWARDS', { max: 255 }),
      check('employed', 'Employed', 'CURRENT EMPLOYMENT STATUS'),
      check('unemployed', 'Unemployed', 'CURRENT EMPLOYMENT STATUS'),
      check('selfEmployed', 'Self-Employed', 'CURRENT EMPLOYMENT STATUS'),
      text('remarks', 'Remarks', 'OTHER', { max: 100 }),
    ],
  },
}

// Case-insensitive lookup (options + aliases) for choice columns.
for (const program of Object.values(PROGRAMS)) {
  for (const col of program.columns) {
    if (col.type !== 'enum') continue
    col.lookup = new Map([
      ...col.options.map((o) => [o.toLowerCase(), o]),
      ...Object.entries(col.aliases || {}).map(([k, v]) => [k.toLowerCase(), v]),
    ])
  }
}

module.exports = { LAYOUT, PROGRAMS }
