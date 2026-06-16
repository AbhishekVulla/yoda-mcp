import re
import services


def test_book_meal_confirmed_with_reference():
    r = services.book_meal(date="tomorrow", meal_type="lunch")
    assert r["status"] == "confirmed"
    assert re.fullmatch(r"MEAL-\d{4}", r["reference"])
    assert r["date"] == "tomorrow"
    assert r["meal_type"] == "lunch"
    # the spoken message echoes the details back to the senior
    assert "tomorrow" in r["message"]
    assert r["reference"] in r["message"]


def test_book_meal_defaults_to_lunch():
    r = services.book_meal(date="2026-06-11")
    assert r["meal_type"] == "lunch"


def test_book_activity_confirmed_with_reference():
    r = services.book_activity(
        event_name="Gentle Balance & Stability Class",
        location="Heartbeat@Bedok",
        date="Wednesday, 24 June 2026",
        time="10:00am",
    )
    assert r["status"] == "confirmed"
    assert re.fullmatch(r"ACT-\d{4}", r["reference"])
    assert r["event"] == "Gentle Balance & Stability Class"
    assert r["location"] == "Heartbeat@Bedok"
    # the spoken message echoes the details back to the senior
    assert "Heartbeat@Bedok" in r["message"]
    assert r["reference"] in r["message"]
