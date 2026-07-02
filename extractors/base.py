from abc import ABC, abstractmethod

class BaseExtractor(ABC):
    """Base class for all media extractors."""

    @abstractmethod
    def extract(self, url: str) -> dict:
        """
        Extracts media information from the given URL.
        Must return a dictionary containing:
        - platform (str)
        - media_metadata (dict)
        """
        pass
