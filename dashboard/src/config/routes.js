// Single list of everything the app can open.
// To add a program: lazy-import its page, add one line to `programs`.
import { lazy } from 'react'
import gipLogo from '../assets/gip.png'
import doktorLogo from '../assets/doktor.png'
import livelihoodLogo from '../assets/livelihood.png'
import ofwLogo from '../assets/ofw.png'
import sagutLogo from '../assets/sagut.png'
import spesLogo from '../assets/spes.png'
import tupadLogo from '../assets/tupad.png'
import bridgingLogo from '../assets/bridging.png'
import jobvacancyLogo from '../assets/jobvacancy.png'
import jobseekerLogo from '../assets/jobseeker.png'

// Each page is downloaded only when the user opens it.
const Gip = lazy(() => import('../page/gip.jsx'))
const Sagut = lazy(() => import('../page/sagut.jsx'))
const Bridging = lazy(() => import('../page/bridging.jsx'))
const Doktor = lazy(() => import('../page/doktor.jsx'))
const Livelihood = lazy(() => import('../page/livelihood.jsx'))
const Jobseekers = lazy(() => import('../page/jobseeker.jsx'))
const Jobvacancy = lazy(() => import('../page/jobvacancy.jsx'))
const Ofw = lazy(() => import('../page/ofw.jsx'))
const Spes = lazy(() => import('../page/spes.jsx'))
const Tupad = lazy(() => import('../page/tupad.jsx'))
const Users = lazy(() => import('../page/users.jsx'))
const Guwip = lazy(() => import('../page/guwip.jsx'))
const TrPatu = lazy(() => import('../page/trpatu.jsx'))

// ...the rest of the file (programGroups, programs, routes) stays exactly the same

// Section headings on the home page, in the order they appear.
// Each program below picks one with its `group` field.
export const programGroups = ['Employment', 'Livelihood', 'Scholarships', 'OFW Services']

// Shown as cards on the home page.
export const programs = [
  { name: 'GIP', group: 'Employment', logo: 'GIP', image: gipLogo, path: '/gip', component: Gip },
  { name: 'SAGUT', group: 'Scholarships', logo: 'SAGUT', image: sagutLogo, path: '/sagut', component: Sagut },
  { name: 'BRIDGING', group: 'Livelihood', logo: 'BR', image: bridgingLogo, path: '/bridging', component: Bridging },
  { name: 'DOKTOR', group: 'Scholarships', logo: 'DOK', image: doktorLogo, path: '/doktor', component: Doktor },
  { name: 'LIVELIHOOD', group: 'Livelihood', logo: 'LIV', image: livelihoodLogo, path: '/livelihood', component: Livelihood },
  { name: 'JOBSEEKERS', group: 'Employment', logo: 'JS', image: jobseekerLogo, path: '/jobseeker', component: Jobseekers },
  { name: 'JOBVACANCY', group: 'Employment', logo: 'JV', image: jobvacancyLogo, path: '/jobvacancy', component: Jobvacancy },
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