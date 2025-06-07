import re
from datetime import datetime

def clean_date_content(content: str) -> str:
    lines = content.splitlines()
    processed_lines = []
    # Target date for comparison
    cutoff_date = datetime(2025, 5, 1).date()

    for line_number, line in enumerate(lines):
        original_line = line # Keep a copy for complex cases or if no changes apply

        # Skip processing for lines that should be preserved as is
        if "Current Session" in line:
            processed_lines.append(line)
            continue

        # Pattern 1: Standalone "*(Date: YYYY-MM-DD)*" or "--- *(Date: YYYY-MM-DD)*"
        # Match "*(Date: YYYY-MM-DD)*"
        match_star_date = re.search(r"\*\(Date: (\d{4}-\d{2}-\d{2})\)\*", line)
        if match_star_date:
            date_str = match_star_date.group(1)
            try:
                parsed_date = datetime.strptime(date_str, "%Y-%m-%d").date()
                if parsed_date < cutoff_date:
                    # If line is ONLY "*(Date: YYYY-MM-DD)*" (with optional surrounding whitespace)
                    if re.fullmatch(r"\s*\*\(Date: \d{4}-\d{2}-\d{2}\)\*\s*", line):
                        continue # Remove the line
                    # If line is "--- *(Date: YYYY-MM-DD)*" (with optional surrounding whitespace)
                    elif re.fullmatch(r"^(---)\s*\*\(Date: \d{4}-\d{2}-\d{2}\)\*\s*$", line):
                        line = re.sub(r"\*\(Date: \d{4}-\d{2}-\d{2}\)\*", "", line).strip() # Remove date part, keep "---"
                        if line == "---": # ensure it's just the separator
                           processed_lines.append(line)
                           continue
                        else: # if other text exists, fall through to general replacement
                            line = original_line # reset line for other patterns
                    else:
                        # It's part of a larger line, just remove the date part
                        line = line.replace(match_star_date.group(0), "*()*")
            except ValueError:
                pass # Not a valid date string, leave it

        # Pattern 2: Lines starting with "## YYYY-MM-DD"
        # Replacing "## YYYY-MM-DD" with "## "
        match_heading_date = re.match(r"^(## )(\d{4}-\d{2}-\d{2})(.*)$", line)
        if match_heading_date:
            date_str = match_heading_date.group(2)
            try:
                parsed_date = datetime.strptime(date_str, "%Y-%m-%d").date()
                if parsed_date < cutoff_date:
                    line = match_heading_date.group(1) + match_heading_date.group(3) # "## " + rest of line
            except ValueError:
                pass # Not a valid date, line remains unchanged by this rule


        # Pattern 3: "(Completed on YYYY-MM-DD)", "(Submitted: YYYY-MM-DD)", etc.
        # This needs to be applied carefully to the potentially already modified line
        def replace_inline_pattern(match_obj):
            prefix_text = match_obj.group(1) # Full prefix e.g. "Completed on", "Submitted: ", "Task Completion Date: ", "As of "
            date_str = match_obj.group(2)    # Date YYYY-MM-DD
            # group(3) is the closing parenthesis ')' which we want to keep if we keep the prefix

            try:
                parsed_date = datetime.strptime(date_str, "%Y-%m-%d").date()
                if parsed_date < cutoff_date:
                    # Remove "on ", ": ", "as of " from the prefix if present
                    # And remove the date itself
                    cleaned_prefix = prefix_text
                    if prefix_text.endswith(" on "):
                        cleaned_prefix = prefix_text[:-4]
                    elif prefix_text.endswith(": "):
                        cleaned_prefix = prefix_text[:-2]
                    elif prefix_text.endswith(" as of "): # Specific for "vX.Y.Z-beta as of YYYY-MM-DD"
                         cleaned_prefix = prefix_text[:-8] # Remove " as of "

                    if cleaned_prefix.strip() == "v2.1.0-beta": # Special handling for version string, preserve it
                        return f"({cleaned_prefix})" # Should result in (v2.1.0-beta) if date was old
                    elif cleaned_prefix.strip(): # If prefix is not empty after stripping
                        return f"({cleaned_prefix.strip()})"
                    else: # If prefix becomes empty, just return empty parentheses or nothing
                        return "()" # Or "" if preferred
                else: # Date is not old, return original match
                    return match_obj.group(0)
            except ValueError:
                return match_obj.group(0) # Not a date or malformed, return original

        # Applied regex for various prefixes before a date in parentheses
        line = re.sub(r"\((Completed on |Submitted: |Task Completion Date: |As of |v[\d\.]+\S* as of )(\d{4}-\d{2}-\d{2})(\))", replace_inline_pattern, line)

        # A simpler, more direct replacement for specific known patterns if the above is too broad
        # Example: (Completed on YYYY-MM-DD) -> (Completed)
        line = re.sub(r"\(Completed on (\d{4}-\d{2}-\d{2})\)",
                      lambda m: "(Completed)" if datetime.strptime(m.group(1), "%Y-%m-%d").date() < cutoff_date else m.group(0),
                      line)
        # Example: (Submitted: YYYY-MM-DD) -> (Submitted)
        line = re.sub(r"\(Submitted: (\d{4}-\d{2}-\d{2})\)",
                      lambda m: "(Submitted)" if datetime.strptime(m.group(1), "%Y-%m-%d").date() < cutoff_date else m.group(0),
                      line)
        # Example: (Task Completion Date: YYYY-MM-DD) -> (Task Completion Date)
        line = re.sub(r"\(Task Completion Date: (\d{4}-\d{2}-\d{2})\)",
                      lambda m: "(Task Completion Date)" if datetime.strptime(m.group(1), "%Y-%m-%d").date() < cutoff_date else m.group(0),
                      line)
        # Example: (As of YYYY-MM-DD) -> (As of) -- this might be too aggressive, could leave it as is if date is old
        line = re.sub(r"\((v[\d\.]+\S*) as of (\d{4}-\d{2}-\d{2})\)",
                      lambda m: f"({m.group(1)})" if datetime.strptime(m.group(2), "%Y-%m-%d").date() < cutoff_date else m.group(0),
                      line)


        # Cleanup for lines that might have become `--- *()*` or just `*()*` on its own.
        if line.strip() == "*()*":
            continue # Remove line if it's just an empty placeholder
        if line.strip() == "--- *()*":
            line = "---"

        if line.strip() == "##": # If a heading became just "## " then "##"
            continue


        processed_lines.append(line)

    # Filter out any completely empty lines that might have resulted from removals,
    # unless they were intentionally blank (e.g. between paragraphs).
    # This simplistic approach might remove intentional blank lines.
    # A better way would be to track if a line *became* empty due to processing.
    final_lines = [pl for pl in processed_lines if pl.strip() != ""]
    # However, the original spec implies removing lines that *become* empty.
    # The `continue` statements handle lines that should be fully removed.
    # This final filter is more about general cleanup.
    # Let's stick to what the `continue` does and avoid this broad filter for now.

    return "\n".join(processed_lines)

# Read, process, and write the file
file_path = "Dev/tasks/completed.md"

try:
    with open(file_path, "r", encoding="utf-8") as f:
        original_content = f.read()

    cleaned_content = clean_date_content(original_content)

    with open(file_path, "w", encoding="utf-8") as f:
        f.write(cleaned_content)

    print(f"Successfully processed {file_path}")

except FileNotFoundError:
    print(f"Error: File not found at {file_path}")
except Exception as e:
    print(f"An error occurred: {e}")
