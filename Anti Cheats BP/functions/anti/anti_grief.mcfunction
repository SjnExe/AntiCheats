tellraw @s {"rawtext":[{"text":"§6[§eAnti Cheats§6]§r§c§l "},{"text":"ERROR: §r§4This function shouldn't be ran manually§r"}]}
# Gamerules removed - should be set on setup.

# Detect and act on TNT, clear items, kill entities - conditionally executed once globally.
# This assumes that if even one player has grief_on=0, these protections should be active globally.
# A more robust solution might involve tagging a global entity or using a scoreboard for a global state.
execute if entity @a[scores={grief_on=0}] run execute at @e[type=tnt] run tellraw @a {"rawtext":[{"text":"§6[§eAnti Cheats§6]§r§4 Suspicious TNT detected! Action taken."}]}
# execute if entity @a[scores={grief_on=0}] run execute as @e[type=tnt] run execute as @p run function punishment/warning/grief_warning # Commented out due to risk of punishing wrong player

execute if entity @a[scores={grief_on=0}] run clear @a[tag=!admin] tnt 0
execute if entity @a[scores={grief_on=0}] run clear @a[tag=!admin] tnt_minecart 0
execute if entity @a[scores={grief_on=0}] run clear @a[tag=!admin] end_crystal 0
execute if entity @a[scores={grief_on=0}] run clear @a[tag=!admin] respawn_anchor 0

execute if entity @a[scores={grief_on=0}] run kill @e[type=tnt]
execute if entity @a[scores={grief_on=0}] run kill @e[type=tnt_minecart]

# Fill commands removed - too resource-intensive for per-tick.
# These should be admin-triggered or part of a very infrequent/controlled mechanism.