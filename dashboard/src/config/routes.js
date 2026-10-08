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

// Shown as cards on the home page.
export const programs = [
  { name: 'GIP', logo: 'GIP', path: '/gip', component: Gip },
  { name: 'SAGUT', logo: 'SAGUT', path: '/sagut', component: Sagut },
  { name: 'BRIDGING', logo: 'BR', path: '/bridging', component: Bridging },
  { name: 'DOKTOR', logo: 'DOK', path: '/doktor', component: Doktor },
  { name: 'LIVELIHOOD', logo: 'LIV', path: '/livelihood', component: Livelihood },
  { name: 'JOBSEEKERS', logo: 'JS', path: '/jobseeker', component: Jobseekers },
  { name: 'JOBVACANCY', logo: 'JV', path: '/jobvacancy', component: Jobvacancy },
  { name: 'OFW', logo: 'OFW', path: '/ofw', component: Ofw },
  { name: 'SPES', logo: 'SPES', path: '/spes', component: Spes },
  { name: 'TUPAD', logo: 'TUPAD', path: '/tupad', component: Tupad },
]

// Every page that needs a login (programs + admin pages).
export const routes = [
  ...programs,
  { name: 'User Management', path: '/users', component: Users, adminOnly: true },
]
