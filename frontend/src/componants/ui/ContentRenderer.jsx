import React from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { atomDark, oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { useTheme } from '../../contexts/ThemeContext';

/**
 * ContentRenderer
 * 
 * Renders text content, automatically detecting and highlighting code blocks
 * enclosed in triple backticks (```language ... ```).
 * 
 * @param {string} content - The raw text content to render
 * @param {string} className - Optional additional classes
 */
const unescapeHtml = (text) => {
    if (!text) return text;
    return text
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&#34;/g, '"')
        .replace(/&#039;/g, "'")
        .replace(/&#39;/g, "'")
        .replace(/&apos;/g, "'")
        .replace(/&#x27;/g, "'")
        .replace(/&#x2F;/g, "/")
        .replace(/&#47;/g, "/")
        .replace(/&#96;/g, "`")
        .replace(/&#x60;/g, "`");
};

/**
 * ContentRenderer
 * 
 * Renders text content, automatically detecting and highlighting code blocks
 * enclosed in triple backticks (```language ... ```).
 * 
 * @param {string} content - The raw text content to render
 * @param {string} className - Optional additional classes
 */
const ContentRenderer = ({ content, className }) => {
    const { isDarkMode } = useTheme();

    if (!content) return null;

    // Unescape HTML entities that might have been sanitized
    const decodedContent = unescapeHtml(content);

    // Split content by code blocks
    // Regex captures: 1: language (optional), 2: code content
    // Improved regex handles optional spaces after language tag
    const parts = decodedContent.split(/```(\w+)?(?:[ ]+)?\n?([\s\S]*?)```/g);

    return (
        <div className={`leading-relaxed ${isDarkMode ? 'text-gray-200' : 'text-gray-800'} ${className || 'text-[15px]'}`}>
            {parts.map((part, index) => {
                // The split with capturing groups results in:
                // [text, lang, code, text, lang, code, text...]
                // So:
                // index % 3 === 0: text
                // index % 3 === 1: language
                // index % 3 === 2: code

                // However, we need to process this carefully.
                // Let's use a more robust parsing approach if the simple split logic is tricky with optional groups.

                // Actually, matching all occurrences might be safer to construct the array.
                // But let's try a standard parsing loop for clarity or just handle the split result.
                // If the regex has capturing groups, split includes them.

                // If the content starts with a code block, parts[0] is empty string.

                if (index % 3 === 0) {
                    // Regular text
                    if (!part) return null;
                    return (
                        <span key={index} className="whitespace-pre-wrap">
                            {part}
                        </span>
                    );
                }

                if (index % 3 === 1) {
                    // Language - skip rendering, it's used in the next iteration (code)
                    // But wait, map returns an array of elements. We can't easily look ahead without reducing or chunking.
                    // Let's rethink the structure.
                    return null;
                }

                if (index % 3 === 2) {
                    // Code block
                    const language = parts[index - 1] || 'text';
                    const code = part;

                    return (
                        <div key={index} className="my-4 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
                            <SyntaxHighlighter
                                language={language}
                                style={isDarkMode ? atomDark : oneLight}
                                customStyle={{
                                    margin: 0,
                                    borderRadius: '0.5rem',
                                    fontSize: '0.9em',
                                }}
                                wrapLongLines={true}
                            >
                                {code.trim()}
                            </SyntaxHighlighter>
                        </div>
                    )
                }
                return null;
            })}
        </div>
    );
};

export default ContentRenderer;
