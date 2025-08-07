# Minecraft Bedrock Edition Text Formatting Guide

This document provides a comprehensive guide to the text formatting codes used in Minecraft: Bedrock Edition. These codes allow you to add color and style to in-game text, such as in chat, on signs, in books, and in world/item names.

## Usage

To use a formatting code, you must prefix it with the section sign (`§`). On most keyboards, this can be typed by holding `Alt` and typing `21` on the numpad, or by copying and pasting it directly.

**Example:**
To make text red, you would type: `§cHello World` which would display as: <font color='red'>Hello World</font>

You can combine a color code with one or more style codes. The style codes must come *after* the color code.

**Example:**
To make text bold and green, you would type: `§a§lBold Green Text` which would display as: <font color='green'><b>Bold Green Text</b></font>

---

## Color Codes

Here is a list of all available color codes in Bedrock Edition.

| Code | Color Name      | Example                                  |
| :--- | :-------------- | :--------------------------------------- |
| `§0` | Black           | <font color='black'>Black Text</font>    |
| `§1` | Dark Blue       | <font color='darkblue'>Dark Blue Text</font> |
| `§2` | Dark Green      | <font color='darkgreen'>Dark Green Text</font> |
| `§3` | Dark Aqua       | <font color='darkcyan'>Dark Aqua Text</font> |
| `§4` | Dark Red        | <font color='darkred'>Dark Red Text</font>   |
| `§5` | Dark Purple     | <font color='purple'>Dark Purple Text</font> |
| `§6` | Gold            | <font color='gold'>Gold Text</font>          |
| `§7` | Gray            | <font color='gray'>Gray Text</font>          |
| `§8` | Dark Gray       | <font color='darkgray'>Dark Gray Text</font> |
| `§9` | Blue            | <font color='blue'>Blue Text</font>          |
| `§a` | Green           | <font color='green'>Green Text</font>        |
| `§b` | Aqua            | <font color='aqua'>Aqua Text</font>          |
| `§c` | Red             | <font color='red'>Red Text</font>            |
| `§d` | Light Purple    | <font color='pink'>Light Purple Text</font>  |
| `§e` | Yellow          | <font color='yellow'>Yellow Text</font>      |
| `§f` | White           | <font color='white'>White Text</font>        |
| `§g` | Minecoin Gold   | <font color='orange'>Minecoin Gold Text</font> |

---

## Style Codes

These codes can be used to add styling to text. They can be combined with each other and with a color code.

| Code | Style Name    | Description                                       | Example                          |
| :--- | :------------ | :------------------------------------------------ | :------------------------------- |
| `§l` | **Bold**      | Makes the text bold.                              | **Bold Text**                    |
| `§o` | *Italic*      | Makes the text italic.                            | *Italic Text*                    |
| `§n` | <u>Underline</u> | Underlines the text. (Not supported in all contexts) | <u>Underlined Text</u>          |
| `§m` | ~~Strikethrough~~ | Adds a strikethrough to the text. (Not supported in all contexts) | ~~Strikethrough Text~~   |
| `§k` | Obfuscated    | Displays random, changing characters.             | (Displays as random characters)  |
| `§r` | Reset         | Resets all formatting (color and style) to default. | Resets to default text style.    |

---

## Special Codes (Bedrock Exclusive)

| Code | Style Name | Description                                                                                             |
| :--- | :--------- | :------------------------------------------------------------------------------------------------------ |
| `§g` | Minecoin Gold | A specific shade of gold used for Minecoin-related text.                                               |

---

## Important Notes

- If you use multiple color codes in a row, only the **last** one will be applied.
- If you use a style code before a color code, the style might be reset. Always apply the color first.
- The `§r` (Reset) code is very useful for returning to default formatting within the same line of text without starting a new line.
- The `§n` (Underline) and `§m` (Strikethrough) codes are not rendered in all parts of the game (e.g., chat). They are most reliably seen on signs.
- The `§k` (Obfuscated) effect will continue until a `§r` (Reset) is used or a new color code is applied.
