<?php

namespace App\Http\Controllers;

use App\Models\Enquiry;
use App\Rules\NoLineBreaks;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Public contact-form enquiries.
 */
class EnquiryController extends Controller
{
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'min:2', 'max:150'],
            'email' => ['required', new NoLineBreaks, 'email:rfc', 'max:190'],
            'subject' => ['required', 'string', 'min:3', 'max:190'],
            'message' => ['required', 'string', 'min:10', 'max:5000'],
        ]);

        Enquiry::create([
            'name' => $validated['name'],
            'email' => mb_strtolower(trim($validated['email'])),
            'subject' => $validated['subject'],
            'message' => $validated['message'],
        ]);

        return response()->json([
            'message' => 'Thank you for reaching out. Our team will get back to you soon.',
        ], 201);
    }
}
