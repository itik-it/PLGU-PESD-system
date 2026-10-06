require('dotenv').config()

const cors = require('cors')
const express = require('express')
const helmet = require('helmet')
const mysql = require('mysql2/promise')
const { z } = require('zod')

const app = express()
const port = Number(process.env.PORT || 3000)


// DATABASE CONNECTIONS

// GIP database
const gipPool = mysql.createPool({
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_GIP_NAME || 'lgu_gip',
  waitForConnections: true,
  connectionLimit: Number(
    process.env.DB_CONNECTION_LIMIT || 10
  ),
  dateStrings: true,
})

// Login database
const usersPool = mysql.createPool({
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_USERS_NAME || 'lgu_users',
  waitForConnections: true,
  connectionLimit: Number(
    process.env.DB_CONNECTION_LIMIT || 10
  ),
  dateStrings: true,
})


// MIDDLEWARE

app.use(helmet())

app.use(
  cors({
    origin:
      process.env.CLIENT_ORIGIN ||
      'http://localhost:5173',
  })
)

app.use(
  express.json({
    limit: '1mb',
  })
)

// VALIDATION SCHEMA

const applicantSchema = z.object({

  // PERSONAL INFORMATION

  lastName: z
    .string()
    .trim()
    .min(1, 'Last name is required.'),

  firstName: z
    .string()
    .trim()
    .min(1, 'First name is required.'),

  middleName: z
    .string()
    .trim()
    .default(''),

  extensionName: z
    .string()
    .trim()
    .default(''),

  birthdate: z
    .string()
    .date(),

  sex: z
    .string()
    .trim()
    .min(1, 'Sex is required.'),

  civilStatus: z
    .string()
    .trim()
    .min(1, 'Civil status is required.'),

  address: z
    .string()
    .trim()
    .default(''),

  barangay: z
    .string()
    .trim()
    .min(1, 'Barangay is required.'),

  municipality: z
    .string()
    .trim()
    .min(1, 'Municipality is required.'),

  province: z
    .string()
    .trim()
    .min(1, 'Province is required.'),

  course: z
    .string()
    .trim()
    .default(''),

  email: z
    .union([
      z.string().trim().email(),
      z.literal(''),
    ])
    .default(''),

  contactNumber: z
    .string()
    .trim()
    .default(''),

  // CLASSIFICATIONS
  //
  // Multiple classifications are allowed.
  //

  classifications: z
    .array(
      z.string().trim().min(1)
    )
    .min(
      1,
      'At least one classification is required.'
    ),



  // APPLICATION INFORMATION


  dateApplied: z
    .union([
      z.string().date(),
      z.literal(''),
    ])
    .default(''),

  remarks: z
    .string()
    .trim()
    .default(''),


  // REQUIREMENTS
  // These are represented by checkboxes in React.

  requirements: z.object({

    gipForm: z
      .boolean()
      .default(false),

    resume: z
      .boolean()
      .default(false),

    validId: z
      .boolean()
      .default(false),

    psa: z
      .boolean()
      .default(false),

    diploma: z
      .boolean()
      .default(false),

    tor: z
      .boolean()
      .default(false),

  }),


  // SUPPORTING DOCUMENTS
  // This is a text field, not a checkbox.

  supportingDocuments: z
    .string()
    .trim()
    .default(''),

})


// HELPER FUNCTIONS

/**
 * Calculates the applicant's age from the birthdate.
 */
function calculateAge(birthdate) {

  const birth = new Date(
    `${birthdate}T00:00:00`
  )

  const today = new Date()

  let age =
    today.getFullYear() -
    birth.getFullYear()

  const monthDifference =
    today.getMonth() -
    birth.getMonth()

  if (
    monthDifference < 0 ||
    (
      monthDifference === 0 &&
      today.getDate() < birth.getDate()
    )
  ) {
    age--
  }

  return age
}


// REQUIREMENT MAPPING

const requirementMap = {

  gipForm: 'GIP/IP Form',

  resume: 'Resume',

  validId: 'Valid ID',

  psa: 'PSA',

  diploma: 'Diploma',

  tor: 'TOR',

}

// ROOT TEST ROUTE

app.get('/', (_request, response) => {

  response.json({
    message: 'LGU/PESO API is running.',
  })

})


// HEALTH CHECK

app.get(
  '/api/health',
  async (_request, response) => {

    try {

      await gipPool.query('SELECT 1')

      await usersPool.query('SELECT 1')

      response.json({

        status: 'ok',

        gipDatabase: 'connected',

        usersDatabase: 'connected',

      })

    } catch (error) {

      console.error(
        'Database health check failed:',
        error.message
      )

      response.status(503).json({

        status: 'error',

        gipDatabase: 'disconnected',

        usersDatabase: 'disconnected',

      })

    }

  }
)


// GET CLASSIFICATIONS


app.get(
  '/api/gip/classifications',
  async (_request, response, next) => {

    try {

      const [rows] =
        await gipPool.query(`

          SELECT
            id,
            classification_name

          FROM classifications

          WHERE is_active = TRUE

          ORDER BY id

        `)

      response.json(rows)

    } catch (error) {

      next(error)

    }

  }
)

// GET REQUIREMENTS

app.get(
  '/api/gip/requirements',
  async (_request, response, next) => {

    try {

      const [rows] =
        await gipPool.query(`

          SELECT
            id,
            requirement_name,
            is_required

          FROM requirement_types

          WHERE is_active = TRUE

          ORDER BY id

        `)

      response.json(rows)

    } catch (error) {

      next(error)

    }

  }
)


// GET ALL GIP APPLICANTS

app.get(
  '/api/gip/applicants',
  async (_request, response, next) => {

    try {

      // GET APPLICANTS + APPLICATION

      const [applicants] =
        await gipPool.query(`

          SELECT

            a.id,

            a.last_name,

            a.first_name,

            a.middle_name,

            a.name_extension,

            a.birthdate,

            a.age,

            a.sex,

            a.civil_status,

            a.address,

            a.barangay,

            a.municipality,

            a.province,

            a.course,

            a.email,

            a.contact_number,

            a.created_at,

            a.updated_at,

            ap.id AS application_id,

            ap.date_applied,

            ap.remarks

          FROM applicants a

          LEFT JOIN applications ap
            ON ap.applicant_id = a.id

          ORDER BY
            a.created_at DESC,
            a.id DESC

        `)


      // GET CLASSIFICATIONS

      const [classificationRows] =
        await gipPool.query(`

          SELECT

            ac.applicant_id,

            c.classification_name

          FROM applicant_classifications ac

          INNER JOIN classifications c
            ON c.id = ac.classification_id

          ORDER BY c.id

        `)

      // GET REQUIREMENTS

      const [requirementRows] =
        await gipPool.query(`

          SELECT

            ar.application_id,

            rt.requirement_name,

            ar.status

          FROM application_requirements ar

          INNER JOIN requirement_types rt
            ON rt.id = ar.requirement_type_id

          ORDER BY rt.id

        `)

      // GET SUPPORTING DOCUMENTS

      const [supportingRows] =
        await gipPool.query(`

          SELECT

            application_id,

            document_description

          FROM application_supporting_documents

        `)

      // BUILD FINAL RESPONSE

      const result =
        applicants.map((applicant) => {

          // Classifications

          const classifications =
            classificationRows

              .filter(
                (item) =>
                  item.applicant_id ===
                  applicant.id
              )

              .map(
                (item) =>
                  item.classification_name
              )

          // Requirements

          const requirements = {

            gipForm: false,

            resume: false,

            validId: false,

            psa: false,

            diploma: false,

            tor: false,

          }


          requirementRows

            .filter(
              (item) =>
                item.application_id ===
                applicant.application_id
            )

            .forEach((item) => {

              const key =
                Object.keys(requirementMap)
                  .find(
                    (key) =>
                      requirementMap[key] ===
                      item.requirement_name
                  )

              if (key) {

                requirements[key] =
                  item.status === 'Submitted'

              }

            })

          // Supporting Documents

          const supportingDocument =
            supportingRows.find(
              (item) =>
                item.application_id ===
                applicant.application_id
            )


          // Return applicant

          return {

            id:
              applicant.id,

            lastName:
              applicant.last_name,

            firstName:
              applicant.first_name,

            middleName:
              applicant.middle_name || '',

            extensionName:
              applicant.name_extension || '',

            birthdate:
              applicant.birthdate,

            age:
              applicant.age,

            sex:
              applicant.sex,

            civilStatus:
              applicant.civil_status,

            address:
              applicant.address || '',

            barangay:
              applicant.barangay,

            municipality:
              applicant.municipality,

            province:
              applicant.province,

            course:
              applicant.course || '',

            email:
              applicant.email || '',

            contactNumber:
              applicant.contact_number || '',

            classifications,

            applicationId:
              applicant.application_id,

            dateApplied:
              applicant.date_applied || '',

            remarks:
              applicant.remarks || '',

            requirements,

            supportingDocuments:
              supportingDocument
                ?.document_description || '',

          }

        })


      response.json(result)

    } catch (error) {

      next(error)

    }

  }
)


// CREATE GIP APPLICANT


app.post(
  '/api/gip/applicants',
  async (request, response, next) => {

    let connection

    try {

      // VALIDATE REQUEST

      const applicant =
        applicantSchema.parse(
          request.body
        )

      // GET CONNECTION

      connection =
        await gipPool.getConnection()


      await connection.beginTransaction()

      // CALCULATE AGE

      const age =
        calculateAge(
          applicant.birthdate
        )

      // INSERT APPLICANT

      const [applicantResult] =
        await connection.query(`

          INSERT INTO applicants (

            last_name,

            first_name,

            middle_name,

            name_extension,

            birthdate,

            age,

            sex,

            civil_status,

            address,

            barangay,

            municipality,

            province,

            course,

            email,

            contact_number

          )

          VALUES (
            ?,
            ?,
            ?,
            ?,
            ?,
            ?,
            ?,
            ?,
            ?,
            ?,
            ?,
            ?,
            ?,
            ?,
            ?
          )

        `, [

          applicant.lastName,

          applicant.firstName,

          applicant.middleName || null,

          applicant.extensionName || null,

          applicant.birthdate,

          age,

          applicant.sex,

          applicant.civilStatus,

          applicant.address || null,

          applicant.barangay,

          applicant.municipality,

          applicant.province,

          applicant.course || null,

          applicant.email || null,

          applicant.contactNumber || null,

        ])


      const applicantId =
        applicantResult.insertId

      // INSERT CLASSIFICATIONS

      for (
        const classificationName
        of applicant.classifications
      ) {

        const [classificationRows] =
          await connection.query(`

            SELECT
              id

            FROM classifications

            WHERE classification_name = ?

              AND is_active = TRUE

            LIMIT 1

          `, [
            classificationName
          ])


        if (!classificationRows.length) {

          throw new Error(
            `Invalid classification: ${classificationName}`
          )

        }


        await connection.query(`

          INSERT INTO applicant_classifications (

            applicant_id,

            classification_id

          )

          VALUES (?, ?)

        `, [

          applicantId,

          classificationRows[0].id,

        ])

      }

      // INSERT APPLICATION

      const [applicationResult] =
        await connection.query(`

          INSERT INTO applications (

            applicant_id,

            date_applied,

            remarks

          )

          VALUES (?, ?, ?)

        `, [

          applicantId,

          applicant.dateApplied || null,

          applicant.remarks || null,

        ])


      const applicationId =
        applicationResult.insertId

      // INSERT REQUIREMENTS

      for (
        const [key, requirementName]
        of Object.entries(requirementMap)
      ) {

        const [requirementRows] =
          await connection.query(`

            SELECT
              id

            FROM requirement_types

            WHERE requirement_name = ?

              AND is_active = TRUE

            LIMIT 1

          `, [
            requirementName
          ])


        if (!requirementRows.length) {

          throw new Error(
            `Requirement type not found: ${requirementName}`
          )

        }


        const checked =
          applicant.requirements[key] === true


        await connection.query(`

          INSERT INTO application_requirements (

            application_id,

            requirement_type_id,

            status,

            submitted_at

          )

          VALUES (?, ?, ?, ?)

        `, [

          applicationId,

          requirementRows[0].id,

          checked
            ? 'Submitted'
            : 'Pending',

          checked
            ? new Date()
            : null,

        ])

      }

      // INSERT SUPPORTING DOCUMENTS

      if (
        applicant.supportingDocuments
      ) {

        await connection.query(`

          INSERT INTO
          application_supporting_documents (

            application_id,

            document_description

          )

          VALUES (?, ?)

        `, [

          applicationId,

          applicant.supportingDocuments,

        ])

      }

      // COMMIT TRANSACTION

      await connection.commit()

      // RESPONSE

      response.status(201).json({

        message:
          'Applicant created successfully.',

        applicantId,

        applicationId,

      })

    } catch (error) {

      // ROLLBACK

      if (connection) {

        try {

          await connection.rollback()

        } catch (rollbackError) {

          console.error(
            'Rollback failed:',
            rollbackError.message
          )

        }

      }

      // VALIDATION ERROR

      if (
        error instanceof z.ZodError
      ) {

        response.status(400).json({

          message:
            'Invalid applicant data.',

          errors:
            error.issues,

        })

        return

      }


      next(error)

    } finally {

      if (connection) {

        connection.release()

      }

    }

  }
)


// UPDATE GIP APPLICANT

app.put(
  '/api/gip/applicants/:id',
  async (request, response, next) => {
    let connection

    try {
      const applicantId = Number(request.params.id)
      if (!Number.isInteger(applicantId) || applicantId < 1) {
        response.status(400).json({
          message: 'Applicant ID must be a positive integer.',
        })
        return
      }

      const applicant = applicantSchema.parse(request.body)
      connection = await gipPool.getConnection()
      await connection.beginTransaction()

      const [existingRows] = await connection.query(
        'SELECT id FROM applicants WHERE id = ? FOR UPDATE',
        [applicantId],
      )
      if (!existingRows.length) {
        await connection.rollback()
        response.status(404).json({ message: 'Applicant not found.' })
        return
      }

      await connection.query(`
        UPDATE applicants
        SET last_name = ?, first_name = ?, middle_name = ?, name_extension = ?,
            birthdate = ?, age = ?, sex = ?, civil_status = ?, address = ?,
            barangay = ?, municipality = ?, province = ?, course = ?,
            email = ?, contact_number = ?
        WHERE id = ?
      `, [
        applicant.lastName,
        applicant.firstName,
        applicant.middleName || null,
        applicant.extensionName || null,
        applicant.birthdate,
        calculateAge(applicant.birthdate),
        applicant.sex,
        applicant.civilStatus,
        applicant.address || null,
        applicant.barangay,
        applicant.municipality,
        applicant.province,
        applicant.course || null,
        applicant.email || null,
        applicant.contactNumber || null,
        applicantId,
      ])

      const [applicationRows] = await connection.query(
        'SELECT id FROM applications WHERE applicant_id = ? ORDER BY id DESC LIMIT 1',
        [applicantId],
      )
      if (!applicationRows.length) {
        throw new Error('Application record not found for applicant.')
      }
      const applicationId = applicationRows[0].id

      await connection.query(
        'UPDATE applications SET date_applied = ?, remarks = ? WHERE id = ?',
        [applicant.dateApplied || null, applicant.remarks || null, applicationId],
      )

      await connection.query(
        'DELETE FROM applicant_classifications WHERE applicant_id = ?',
        [applicantId],
      )
      for (const classificationName of applicant.classifications) {
        const [classificationRows] = await connection.query(
          `SELECT id FROM classifications
           WHERE classification_name = ? AND is_active = TRUE LIMIT 1`,
          [classificationName],
        )
        if (!classificationRows.length) {
          throw new Error(`Invalid classification: ${classificationName}`)
        }
        await connection.query(
          `INSERT INTO applicant_classifications
           (applicant_id, classification_id) VALUES (?, ?)`,
          [applicantId, classificationRows[0].id],
        )
      }

      await connection.query(
        'DELETE FROM application_requirements WHERE application_id = ?',
        [applicationId],
      )
      for (const [key, requirementName] of Object.entries(requirementMap)) {
        const [requirementRows] = await connection.query(
          `SELECT id FROM requirement_types
           WHERE requirement_name = ? AND is_active = TRUE LIMIT 1`,
          [requirementName],
        )
        if (!requirementRows.length) {
          throw new Error(`Requirement type not found: ${requirementName}`)
        }
        const checked = applicant.requirements[key] === true
        await connection.query(`
          INSERT INTO application_requirements
            (application_id, requirement_type_id, status, submitted_at)
          VALUES (?, ?, ?, ?)
        `, [
          applicationId,
          requirementRows[0].id,
          checked ? 'Submitted' : 'Pending',
          checked ? new Date() : null,
        ])
      }

      await connection.query(
        'DELETE FROM application_supporting_documents WHERE application_id = ?',
        [applicationId],
      )
      if (applicant.supportingDocuments) {
        await connection.query(`
          INSERT INTO application_supporting_documents
            (application_id, document_description)
          VALUES (?, ?)
        `, [applicationId, applicant.supportingDocuments])
      }

      await connection.commit()
      response.json({
        message: 'Applicant updated successfully.',
        applicantId,
        applicationId,
      })
    } catch (error) {
      if (connection) {
        try {
          await connection.rollback()
        } catch (rollbackError) {
          console.error('Rollback failed:', rollbackError.message)
        }
      }
      if (error instanceof z.ZodError) {
        response.status(400).json({
          message: 'Invalid applicant data.',
          errors: error.issues,
        })
        return
      }
      next(error)
    } finally {
      if (connection) connection.release()
    }
  },
)


// DELETE GIP APPLICANT

app.delete(
  '/api/gip/applicants/:id',
  async (request, response, next) => {

    try {

      const id =
        Number(request.params.id)


      if (
        !Number.isInteger(id) ||
        id < 1
      ) {

        response.status(400).json({

          message:
            'Applicant ID must be a positive integer.',

        })

        return

      }

      const [result] =
        await gipPool.query(
          `
            DELETE FROM applicants
            WHERE id = ?
          `,
          [id]
        )


      if (!result.affectedRows) {

        response.status(404).json({

          message:
            'Applicant not found.',

        })

        return

      }


      response.status(204).end()

    } catch (error) {

      next(error)

    }

  }
)

// 404 HANDLER

app.use(
  (_request, response) => {

    response.status(404).json({

      message:
        'The requested API endpoint was not found.',

    })

  }
)


// GLOBAL ERROR HANDLER

app.use(
  (
    error,
    _request,
    response,
    _next
  ) => {

    console.error(
      'Unhandled server error:',
      error
    )

    response.status(500).json({

      message:
        'The server could not complete the request.',

    })

  }
)

// START SERVER

app.listen(
  port,
  () => {

    console.log(
      `LGU PESO server listening on port ${port}`
    )

  }
)