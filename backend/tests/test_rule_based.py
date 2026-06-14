from app.services.evaluation_service import _rule_based_check



def test_empty_response_fails_all():
    kw_ok, fmt_ok, details = _rule_based_check("", ["hello"], None)
    assert kw_ok is False
    assert fmt_ok is False
    assert details["empty_response"] is True

def test_whitespace_only_response_fails_all():
    kw_ok, fmt_ok, details = _rule_based_check("   \n\t  ", ["hello"], None)
    assert kw_ok is False
    assert fmt_ok is False
    assert details["empty_response"] is True

def test_all_keywords_matched():
    kw_ok, _, details = _rule_based_check("Hello world", ["hello", "world"], None)
    assert kw_ok is True
    assert details["missing_keywords"] == []

def test_missing_keywords_tracked():
    kw_ok, _, details = _rule_based_check("Hello", ["hello", "world"], None)
    assert kw_ok is False
    assert "world" in details["missing_keywords"]
    assert "hello" in details["matched_keywords"]

def test_keyword_check_case_insensitive():
    kw_ok, _, _ = _rule_based_check("HELLO WORLD", ["hello", "world"], None)
    assert kw_ok is True

def test_no_keywords_expected_passes():
    kw_ok, _, details = _rule_based_check("anything", [], None)
    assert kw_ok is True
    assert details["missing_keywords"] == []

def test_regex_match_passes():
    _, fmt_ok, _ = _rule_based_check("Order ID: 12345", [], r"Order ID: \d+")
    assert fmt_ok is True

def test_regex_no_match_fails():
    _, fmt_ok, _ = _rule_based_check("No numbers here", [], r"\d+")
    assert fmt_ok is False

def test_no_regex_format_passes_by_default():
    _, fmt_ok, _ = _rule_based_check("anything", [], None)
    assert fmt_ok is True

def test_partial_keyword_match_returns_correct_details():
    kw_ok, _, details = _rule_based_check(
        "The capital of France is Paris",
        ["paris", "london"],
        None
    )
    assert kw_ok is False
    assert "paris" in details["matched_keywords"]
    assert "london" in details["missing_keywords"]