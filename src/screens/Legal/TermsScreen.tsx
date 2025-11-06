import React from 'react';
import { ScrollView } from 'react-native';
import MarkdownView from './MarkdownView';

const TERMS_MD = `# Terms & Conditions\n\n**Placeholder copy** for terms and conditions.\n\n## Usage\nBy using this app, you agree to our terms.\n\n## Appointments\nCancellations and rescheduling policies apply.\n`;

export default function TermsScreen(): JSX.Element {
  return (
    <ScrollView>
      <MarkdownView markdown={TERMS_MD} />
    </ScrollView>
  );
}

