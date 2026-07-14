from enum import IntEnum


class PermissionLevel(IntEnum):
    READ_ONLY = 1
    READ_WRITE = 2
    FULL_AUTONOMY = 3

    @classmethod
    def from_string(cls, value: str) -> "PermissionLevel":
        mapping = {
            "read_only": cls.READ_ONLY,
            "read_write": cls.READ_WRITE,
            "full_autonomy": cls.FULL_AUTONOMY,
        }
        return mapping[value.lower()]
