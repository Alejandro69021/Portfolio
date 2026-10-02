import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';
import rehypeStringify from 'rehype-stringify';

/**
 * Parses markdown to HTML and sanitizes it using rehype-sanitize to prevent XSS.
 * Used for rendering dynamic descriptions safely on public pages.
 */
export async function renderAndSanitizeMarkdown(markdown: string): Promise<string> {
  if (!markdown) return '';
  try {
    const file = await unified()
      .use(remarkParse)
      .use(remarkRehype)
      .use(rehypeSanitize, defaultSchema)
      .use(rehypeStringify)
      .process(markdown);
    return String(file);
  } catch (err) {
    console.error('Error rendering markdown:', err);
    return markdown;
  }
}
