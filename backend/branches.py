"""DCCB-VZM branches: the single source of truth for branch codes, names,
branch-manager emails and map coordinates. Transcribed from the scanned list in
Documents/*.png — see docs/branches.md.

Coordinates are approximate (the town/locality centre from OpenStreetMap, not
the branch building), so distances shown to customers are "~" values. Replace
lat/lng with a real map pin and set approx=False whenever exact locations are
known.

Branch 201's email (the Head Office) is a super manager (see manager_config.py),
so it does not act as a single-branch manager — Head Office customers are seen
by super managers only.
"""

from dataclasses import dataclass


@dataclass(frozen=True)
class Branch:
    code: int
    name: str
    email: str
    lat: float
    lng: float
    approx: bool = True


BRANCHES: list[Branch] = [
    Branch(201, "Vizianagaram (H.O)", "vzmco201@dccbvzm.org", 18.1141, 83.4114),
    Branch(202, "Bobbili", "bbl202@dccbvzm.org", 18.5748, 83.3523),
    Branch(203, "Cheepurupalli", "cpp203@dccbvzm.org", 18.3100, 83.5665),
    Branch(204, "Gajapathinagaram", "gpm204@dccbvzm.org", 18.2810, 83.3339),
    Branch(205, "Gantyada", "gtd205@dccbvzm.org", 18.1420, 83.2975),
    Branch(206, "Garividi", "gvd206@dccbvzm.org", 18.2824, 83.5336),
    Branch(207, "Kothavalasa", "ktv207@dccbvzm.org", 17.8958, 83.1837),
    Branch(208, "Nellimarla", "nml208@dccbvzm.org", 18.1626, 83.4473),
    Branch(209, "Parvathipuram", "ppm209@dccbvzm.org", 18.7832, 83.4279),
    Branch(210, "Poosapatirega", "ppr210@dccbvzm.org", 18.0915, 83.5518),
    Branch(211, "Srungavarapukota", "skt211@dccbvzm.org", 18.1111, 83.1400),
    Branch(212, "Saluru", "slr212@dccbvzm.org", 18.5176, 83.2050),
    Branch(213, "Seethanagaram", "snr213@dccbvzm.org", 18.6576, 83.3761),
    Branch(214, "Therlam", "tlm214@dccbvzm.org", 18.4867, 83.5042),
    Branch(215, "V.T.Agraharam", "vta215@dccbvzm.org", 18.0854, 83.3870),
    # Same town as the Head Office; shares its approximate coordinates.
    Branch(216, "Vizianagaram", "vzm216@dccbvzm.org", 18.1141, 83.4114),
    Branch(217, "Balijipeta", "blp217@dccbvzm.org", 18.6129, 83.5302),
    Branch(218, "Gurla", "grl218@dccbvzm.org", 18.2118, 83.4658),
    Branch(219, "Ramabhadrapuram", "rbp219@dccbvzm.org", 18.4971, 83.2794),
    Branch(220, "Kurupam", "kpm220@dccbvzm.org", 18.8661, 83.5542),
    Branch(221, "Merakamudidam", "mmm221@dccbvzm.org", 18.4114, 83.4621),
    Branch(222, "Mentada", "mtd222@dccbvzm.org", 18.3097, 83.2617),
    Branch(223, "Vepada", "vpd223@dccbvzm.org", 18.0117, 83.0811),
    # OpenStreetMap only has the mandal centre for Dattirajeru, not the village.
    Branch(224, "Dattirajeru", "dtt224@dccbvzm.org", 18.3919, 83.3779),
    Branch(225, "Bhogapuram", "bgpm225@dccbvzm.org", 18.0321, 83.4978),
]

BRANCHES_BY_CODE: dict[int, Branch] = {b.code: b for b in BRANCHES}
BRANCH_BY_EMAIL: dict[str, Branch] = {b.email.lower(): b for b in BRANCHES}


def branch_name(code: int | None) -> str | None:
    branch = BRANCHES_BY_CODE.get(code) if code is not None else None
    return branch.name if branch else None
