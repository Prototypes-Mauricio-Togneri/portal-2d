/**
 * Application routes.
 * History mode — firebase.json rewrites all paths to /index.html.
 */
import {createRouter, createWebHistory} from 'vue-router'
import ChamberScreen from '@/components/screens/chamber_screen.vue'
import HomeScreen from '@/components/screens/home_screen.vue'
import {findChamber} from '@/services/chamber_catalogue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeScreen,
    },
    {
      path: '/chamber/:number(\\d+)',
      name: 'chamber',
      component: ChamberScreen,
      props: (route) => ({
        chamberNumber: Number(route.params.number),
      }),
      // An address for a chamber that does not exist falls back to the chamber list
      beforeEnter: (to) => (findChamber(Number(to.params.number)) === undefined ? {
        name: 'home',
      } : true),
    },
    // Development only: the playground, outside the chamber list; production builds fall back to the menu
    ...(import.meta.env.DEV ? [
      {
        path: '/playground',
        name: 'playground',
        component: ChamberScreen,
        props: {
          chamberNumber: null,
        },
      },
    ] : []),
    {
      path: '/:pathMatch(.*)*',
      redirect: {
        name: 'home',
      },
    },
  ],
})

export default router
