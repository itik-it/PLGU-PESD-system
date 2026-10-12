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

module.exports = { calculateAge }
