from typing import Optional

import models


def calculate_experience_level(years_of_experience: Optional[int]) -> models.ExperienceLevel:
    """Derive an ExperienceLevel from years_of_experience, so the two can never
    disagree (e.g. "Senior" with 0 years). Missing years_of_experience is treated
    as 0, i.e. student."""
    years = years_of_experience or 0

    if years < 1:
        return models.ExperienceLevel.student
    if years < 3:
        return models.ExperienceLevel.junior
    if years < 6:
        return models.ExperienceLevel.mid
    return models.ExperienceLevel.senior
