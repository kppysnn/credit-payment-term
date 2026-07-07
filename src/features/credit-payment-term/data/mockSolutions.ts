import type { TagOptionGroup } from '../../../components/ui/TagMultiSelect'

// Catalog of solutions sales can attach to a quotation block, grouped the
// same way the business already categorizes its product lines.
export const SOLUTION_GROUPS: TagOptionGroup[] = [
  {
    label: 'Workplace Management (W+)',
    items: ['W+ Meet in Touch', 'W+ Co Desk', 'W+ Locker Space', 'W+ One Pass (Access Control)', 'W+ Visitar (Visitor Management System)'],
  },
  {
    label: 'AV Solution',
    items: ['Interactive Whiteboard', 'Video Conference', 'Digital Signage', 'LCD Display', 'LED Display'],
  },
  {
    label: 'Security',
    items: ['Access Control', 'Visitor Management System', 'CCTV'],
  },
  {
    label: 'Other Product',
    items: ['Meeting Pod'],
  },
  {
    label: 'Service',
    items: ['CR', 'Service'],
  },
  {
    label: 'Interactive Service',
    items: ['Interactive'],
  },
  {
    label: 'Smart Meeting Room',
    items: ['Meeting Room Booking'],
  },
  {
    label: 'Smart Building – Building Management',
    items: ['Smart Parking', 'AIoT'],
  },
]

// "Other Service" has no preset items — TagMultiSelect renders it as a
// free-text add row (allowCustom) instead of a group with options.
export const OTHER_SERVICE_LABEL = 'Other Service'
