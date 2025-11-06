import React from 'react';
import { ScrollView } from 'react-native';
import MarkdownView from './MarkdownView';

const PRIVACY_MD = `# Privacy Policy\n\n**Placeholder copy** describing how we handle your data.\n\n## Data\nWe store minimal personal information required to provide services.\n\n## Contact\nReach us for any privacy concerns.`;

export default function PrivacyScreen(): JSX.Element {
  return (
    <ScrollView>
      <MarkdownView markdown={PRIVACY_MD} />
    </ScrollView>
  );
}

