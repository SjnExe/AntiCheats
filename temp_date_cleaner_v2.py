import re
from datetime import datetime

def clean_date_content(content: str) -> str:
    lines = content.splitlines()
    processed_lines = []
    # Target date for comparison
    cutoff_date = datetime(2025, 5, 1).date()

    for line_content in lines:
        modified_line = line_content

        # Preserve "Current Session" lines first
        if "Current Session" in modified_line:
            processed_lines.append(modified_line)
            continue

        # Pattern 1A: Line is exactly "*(Date: YYYY-MM-DD)*"
        match_standalone = re.fullmatch(r"\s*\*\(Date: (\d{4}-\d{2}-\d{2})\)\*\s*", modified_line)
        if match_standalone:
            date_str = match_standalone.group(1)
            try:
                if datetime.strptime(date_str, "%Y-%m-%d").date() < cutoff_date:
                    # This line should be removed
                    continue
            except ValueError:
                pass

        # Pattern 1B: Line is "--- *(Date: YYYY-MM-DD)*"
        match_sep_date = re.fullmatch(r"^(---)\s*\*\(Date: (\d{4}-\d{2}-\d{2})\)\*\s*$", modified_line)
        if match_sep_date:
            separator = match_sep_date.group(1)
            date_str = match_sep_date.group(2)
            try:
                if datetime.strptime(date_str, "%Y-%m-%d").date() < cutoff_date:
                    modified_line = separator # Keep only "---"
            except ValueError:
                pass

        # Pattern 2: Line starts with "## YYYY-MM-DD"
        def replace_heading_date_func(match_obj):
            date_str = match_obj.group(1)
            rest_of_line = match_obj.group(2)
            try:
                if datetime.strptime(date_str, "%Y-%m-%d").date() < cutoff_date:
                    return f"## {rest_of_line}".strip() # Ensure no double spaces if rest_of_line is empty
            except ValueError:
                pass
            return match_obj.group(0) # Return original if not matched or date is fine
        modified_line = re.sub(r"^## (\d{4}-\d{2}-\d{2})(.*)$", replace_heading_date_func, modified_line)


        # Pattern 3: Inline dates like "(Completed on YYYY-MM-DD)", "(Submitted: YYYY-MM-DD)", etc.
        def replace_inline_date_func(match_obj):
            prefix_full = match_obj.group(1) # Full prefix like "Completed on ", "Submitted: ", "As of "
            date_str = match_obj.group(2)    # Date YYYY-MM-DD
            suffix = match_obj.group(3)      # Usually ")"

            try:
                if datetime.strptime(date_str, "%Y-%m-%d").date() < cutoff_date:
                    cleaned_prefix = prefix_full.strip()

                    if cleaned_prefix.lower().endswith(" on"):
                        cleaned_prefix = cleaned_prefix[:-3].strip()
                    elif cleaned_prefix.lower().endswith(" as of"):
                         cleaned_prefix = cleaned_prefix[:-6].strip() # Remove " as of"
                    elif cleaned_prefix.endswith(":"):
                        cleaned_prefix = cleaned_prefix[:-1].strip()

                    if cleaned_prefix: # If there's a prefix left
                        return f"({cleaned_prefix}{suffix}"
                    else: # If prefix is gone (e.g. "Date: YYYY-MM-DD" becomes "()")
                        return "()" # Or consider removing entirely if appropriate for context
            except ValueError:
                pass # Date parsing error
            return match_obj.group(0) # Return original match if date is fine or parse error

        # Regex for (Prefix Date Suffix)
        # Handles "Completed on YYYY-MM-DD", "Submitted: YYYY-MM-DD", "Task Completion Date: YYYY-MM-DD",
        # "As of YYYY-MM-DD", and "vX.Y.Z-beta as of YYYY-MM-DD"
        # Note: "Date: " is handled by the standalone patterns typically.
        # This targets prefixes ending with "on ", ": ", or "as of "
        modified_line = re.sub(r"\((.*? (?:on |as of |Date: |Completion Date: |Submitted: ))(\d{4}-\d{2}-\d{2})(\))",
                               replace_inline_date_func, modified_line)

        # Specific cleanup for "(As of)" if date was removed, make it just "(As of)"
        modified_line = modified_line.replace("(As of )", "(As of)")


        # If after all modifications, the line (stripped of whitespace) is empty,
        # and it was not originally empty, then skip adding it.
        # However, if it was "---" and became "---", it's fine.
        if modified_line.strip() == "" and line_content.strip() != "":
            # This means the line became empty due to a modification
            # (e.g. a standalone date line was removed by `continue` earlier, or a heading date made it just "##")
            # Let's check if it was a heading that became "##"
            if re.fullmatch(r"##\s*", modified_line): # if it's just "## " or "##"
                 pass # allow it, it might be a section header now
            # else:
                 # continue # skip this line if it became empty from non-empty
                 # Re-evaluating: it's safer to append and then filter at the end or rely on `continue` for full line removal.
                 # For now, let's just append the modified_line.
                 pass


        processed_lines.append(modified_line)

    # Final pass to remove any lines that are now effectively empty (e.g. just "## " with no text after)
    # or lines that were just placeholders like "*()*"
    final_cleaned_lines = []
    for l in processed_lines:
        stripped_l = l.strip()
        if stripped_l == "*()*": # Remove lines that are just this placeholder
            continue
        if stripped_l == "##": # Remove lines that are just "##" after date removal
            continue
        final_cleaned_lines.append(l)

    return "\n".join(final_cleaned_lines)

# Main execution block
if __name__ == "__main__":
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
