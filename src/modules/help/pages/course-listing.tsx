import {
  createListingMetadata,
  createListingPage,
} from '@/core/content/listing-page'

export default createListingPage('course')
export const generateMetadata = createListingMetadata('course')
