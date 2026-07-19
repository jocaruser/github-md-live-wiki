import { expect, test } from '@playwright/test'
import { mockGitHub, SHA } from './github-fixtures'

test.beforeEach(async ({ page }) => {
  await mockGitHub(page)
})

test('renders the overview from the default branch', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'E2E Specs', level: 1 })).toBeVisible()
  await expect(page.getByText('mainonlyword')).toBeVisible()
  await expect(page.getByRole('link', { name: 'Intro' })).toBeVisible()
})

test('navigates between pages from the sidebar', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('link', { name: 'Intro' }).click()
  await expect(page.getByRole('heading', { name: 'Intro', level: 1 })).toBeVisible()
  await expect(page.getByText('Main branch intro body.')).toBeVisible()
  expect(page.url()).toContain('#/main/guide/intro.md')
})

test('links leaving the content tree open the file on GitHub', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('link', { name: 'the schema' })).toHaveAttribute(
    'href',
    'https://github.com/e2e-org/e2e-repo/blob/main/schema.dbml'
  )
})

test('switches to a release from the version menu', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'latest (main)' }).click()
  await page.getByRole('button', { name: 'v1.0.0' }).click()
  await expect(page.getByText('Release overview v1.')).toBeVisible()
  expect(page.url()).toContain('#/v1.0.0/')
})

test('switches to a branch head, including branch-only pages', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'latest (main)' }).click()
  await page.getByRole('button', { name: 'feature/new-spec' }).click()
  await expect(page.getByText('Branch overview.')).toBeVisible()
  await page.getByRole('link', { name: 'Extra' }).click()
  await expect(page.getByText('Only on the branch.')).toBeVisible()
  expect(page.url()).toContain('#/feature%2Fnew-spec/guide/extra.md')
})

test('renders any commit id entered in the version menu', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'latest (main)' }).click()
  await page.getByRole('textbox', { name: 'Commit id' }).fill(SHA)
  await page.getByRole('button', { name: 'Go' }).click()
  await expect(page.getByText('Pinned commit overview.')).toBeVisible()
  expect(page.url()).toContain(SHA)
})

test('searches the loaded version and jumps to a hit', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('link', { name: 'Intro' }).click()
  await page.getByRole('searchbox', { name: 'Search specs' }).fill('mainonlyword')
  await page.getByRole('button', { name: /E2E Specs/ }).click()
  await expect(page.getByText('Search target: mainonlyword.')).toBeVisible()
})

test('serves deep links to a versioned page directly', async ({ page }) => {
  await page.goto('/#/v1.0.0/guide/intro.md')
  await expect(page.getByText('Release intro body.')).toBeVisible()
})

test('auto-translates the shown page, leaving code verbatim', async ({ page }) => {
  await page.addInitScript(() => {
    ;(window as unknown as { Translator: unknown }).Translator = {
      availability: async () => 'available',
      create: async () => ({ translate: async (text: string) => `⟦${text}⟧` }),
    }
  })
  await page.goto('/')
  await page.getByRole('combobox', { name: 'Translate page' }).selectOption('es')
  await expect(page.getByText('⟦Search target: mainonlyword.⟧')).toBeVisible()
  await expect(page.getByText('const untouchedByTranslation = true')).toBeVisible()
  await page.getByRole('link', { name: /⟦?the guide⟧?/ }).click()
  await expect(page.getByText('⟦Main branch intro body.⟧')).toBeVisible()
  await page.getByRole('combobox', { name: 'Translate page' }).selectOption('')
  await expect(page.getByText('Main branch intro body.', { exact: true })).toBeVisible()
})
