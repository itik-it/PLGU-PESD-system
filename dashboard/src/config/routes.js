// Single list of everything the app can open.
// To add a program: import its page, add one line to `programs`.
import Gip from '../page/gip.jsx'
import Sagut from '../page/sagut.jsx'
import Bridging from '../page/bridging.jsx'
import Doktor from '../page/doktor.jsx'
import Livelihood from '../page/livelihood.jsx'
import Jobseekers from '../page/jobseeker.jsx'
import Jobvacancy from '../page/jobvacancy.jsx'
import Ofw from '../page/ofw.jsx'
import Spes from '../page/spes.jsx'
import Tupad from '../page/tupad.jsx'
import Users from '../page/users.jsx'
import gipLogo from '../assets/gip.png'
import doktorLogo from '../assets/doktor.png'
import livelihoodLogo from '../assets/livelihood.png'
import ofwLogo from '../assets/ofw.png'
import sagutLogo from '../assets/sagut.png'
import spesLogo from '../assets/spes.png'
import tupadLogo from '../assets/tupad.png'
import Guwip from '../page/guwip.jsx'
import TrPatu from '../page/trpatu.jsx'

// Section headings on the home page, in the order they appear.
// Each program below picks one with its `group` field.
export const programGroups = ['Employment', 'Livelihood', 'Scholarships', 'OFW Services']

// Shown as cards on the home page.
export const programs = [
  { name: 'GIP', group: 'Employment', logo: 'GIP', image: gipLogo, path: '/gip', component: Gip },
  { name: 'SAGUT', group: 'Scholarships', logo: 'SAGUT', image: sagutLogo, path: '/sagut', component: Sagut },
  { name: 'BRIDGING', group: 'Livelihood', logo: 'BR', path: '/bridging', component: Bridging },
  { name: 'DOKTOR', group: 'Scholarships', logo: 'DOK', image: doktorLogo, path: '/doktor', component: Doktor },
  { name: 'LIVELIHOOD', group: 'Livelihood', logo: 'LIV', image: livelihoodLogo, path: '/livelihood', component: Livelihood },
  { name: 'JOBSEEKERS', group: 'Employment', logo: 'JS', path: '/jobseeker', component: Jobseekers },
  { name: 'JOBVACANCY', group: 'Employment', logo: 'JV', path: '/jobvacancy', component: Jobvacancy },
  { name: 'OFW', group: 'OFW Services', logo: 'OFW', image: ofwLogo, path: '/ofw', component: Ofw },
  { name: 'SPES', group: 'Employment', logo: 'SPES', image: spesLogo, path: '/spes', component: Spes },
  { name: 'TUPAD', group: 'Employment', logo: 'TUPAD', image: tupadLogo, path: '/tupad', component: Tupad },
  { name: 'GUWIP', group: 'Livelihood', logo: 'GUWIP', path: '/guwip', component: Guwip },
  { name: 'TRPATU', group: 'Employment', logo: 'TrPaTu', path: '/trpatu', component: TrPatu },
]

// Every page that needs a login (programs + admin pages).
export const routes = [
  ...programs,
  { name: 'User Management', path: '/users', component: Users, adminOnly: true },
]