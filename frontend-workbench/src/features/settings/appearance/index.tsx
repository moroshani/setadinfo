import { ContentSection } from '../components/content-section'
import { AppearanceForm } from './appearance-form'

export function SettingsAppearance() {
  return (
    <ContentSection
      title='ظاهر'
      desc='تنظیم فونت و پوسته محلی ورک‌بنچ.'
    >
      <AppearanceForm />
    </ContentSection>
  )
}
