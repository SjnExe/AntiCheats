# Temporarily disables mobGriefing to prevent fire from lightning.
# Note: This pattern has risks if the function is interrupted or in highly concurrent scenarios.
gamerule mobGriefing false
execute at @s run summon minecraft:lightning_bolt ~ ~3~
execute as @s run playsound random.levelup @s
execute at @s run particle minecraft:totem_particle ~~1~
gamerule mobGriefing true